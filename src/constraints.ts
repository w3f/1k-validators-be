import { blake2AsHex } from "@polkadot/util-crypto";

import ApiHandler from "./ApiHandler";
import ChainData from "./chaindata";
import { WEEK, KOTVBackendEndpoint } from "./constants";
import logger from "./logger";
import { CandidateData } from "./types";
import axios from "axios";
import { formatAddress } from "./util";
import { Config } from "./config";
import Db from "./db";
import Database from "./db";
import semver from "semver";
import {
  absMax,
  absMin,
  asc,
  getStats,
  mean,
  median,
  q10,
  q25,
  q75,
  q90,
  scaled,
  std,
} from "./score";

export interface Constraints {
  getValidCandidates(candidates: any[], db: Db): Promise<any[]>;
  processCandidates(
    candidates: Set<CandidateData>
  ): Promise<[Set<any>, Set<any>]>;
}

export class OTV implements Constraints {
  private chaindata: ChainData;

  // Constraint configurations
  private skipConnectionTime: boolean;
  private skipIdentity: boolean;
  private skipStakedDesitnation: boolean;
  private skipClientUpgrade: boolean;
  private skipUnclaimed: boolean;

  // configurable constants
  private minSelfStake: number;
  private commission: number;
  private unclaimedEraThreshold: number;

  private config: Config;
  private db: Database;

  // caches
  private validCache: CandidateData[] = [];
  private invalidCache: string[] = [];

  constructor(
    handler: ApiHandler,
    skipConnectionTime = false,
    skipIdentity = false,
    skipStakedDestination = false,
    skipClientUpgrade = false,
    skipUnclaimed = false,
    minSelfStake = 0,
    commission = 0,
    unclaimedEraThreshold = 0,
    config: Config,
    db: Database
  ) {
    this.chaindata = new ChainData(handler);

    this.skipConnectionTime = skipConnectionTime;
    this.skipIdentity = skipIdentity;
    this.skipStakedDesitnation = skipStakedDestination;
    this.skipClientUpgrade = skipClientUpgrade;
    this.skipUnclaimed = skipUnclaimed;

    this.minSelfStake = minSelfStake;
    this.commission = commission;
    this.unclaimedEraThreshold = unclaimedEraThreshold;

    this.config = config;
    this.db = db;
  }

  get validCandidateCache(): CandidateData[] {
    return this.validCache;
  }

  get invalidCandidateCache(): string[] {
    return this.invalidCache;
  }

  async populateIdentityHashTable(
    candidates: CandidateData[]
  ): Promise<Map<string, number>> {
    logger.info(`(OTV::populateIdentityHashTable) Populating hash table`);
    const map = new Map();

    for (const candidate of candidates) {
      const { stash } = candidate;
      const identityString = await this.chaindata.getIdentity(stash);
      const identityHash = blake2AsHex(identityString);
      const prevValue = map.get(identityHash) || 0;
      map.set(identityHash, prevValue + 1);
    }

    return map;
  }

  /// Returns true if it's a valid candidate or [false, "reason"] otherwise.
  async getInvalidCandidates(
    candidates: CandidateData[]
  ): Promise<{ stash: string; reason: string }[]> {
    let invalid = await Promise.all(
      candidates.map(async (candidate) => {
        const { stash } = candidate;
        const [isValid, reason] = await this.checkSingleCandidate(candidate);
        if (!isValid) return { stash, reason };
      })
    );

    // filter out any `undefined` results.
    invalid = invalid.filter((i) => !!i);

    this.invalidCache = invalid.map((i) => i.reason);

    return invalid;
  }

  /// Returns true if it's a valid candidate or [false, "reason"] otherwise.
  async checkSingleCandidate(
    candidate: CandidateData
  ): Promise<[boolean, string]> {
    const {
      discoveredAt,
      updated,
      name,
      offlineAccumulated,
      offlineSince,
      onlineSince,
      stash,
      kusamaStash,
      skipSelfStake,
      unclaimedEras,
    } = candidate;

    // Ensure the candidate is online.
    await checkOnline(this.db, candidate);
    if (Number(onlineSince) === 0 || Number(offlineSince) !== 0) {
      return [false, `${name} offline. Offline since ${offlineSince}.`];
    }

    // Check that the validator has a validate intention
    const validators = await this.chaindata.getValidators();
    await checkValidateIntention(
      this.config,
      this.chaindata,
      this.db,
      candidate
    );
    if (!validators.includes(formatAddress(stash, this.config))) {
      return [false, `${name} does not have a validate intention`];
    }

    // Only take nodes that have been upgraded to latest versions.
    await checkLatestClientVersion(this.config, this.db, candidate);
    if (!this.config.constraints.skipClientUpgrade) {
      const latestRelease = await this.db.getLatestRelease();
      if (latestRelease) {
        const nodeVersion = semver.coerce(candidate.version);
        const latestVersion = semver.clean(latestRelease.name);
        const isUpgraded = semver.gte(nodeVersion, latestVersion);
        if (!isUpgraded && !this.skipClientUpgrade) {
          return [false, `${name} is not running the latest client code.`];
        }
      }
    }

    // Ensure the node has been connected for a minimum of one week.
    await checkConnectionTime(this.config, this.db, candidate);
    if (!this.skipConnectionTime) {
      const now = new Date().getTime();
      if (now - discoveredAt < WEEK) {
        return [false, `${name} hasn't been connected for minimum length.`];
      }
    }

    // Ensure the validator stash has an identity set.
    if (!this.skipIdentity) {
      await checkIdentity(this.chaindata, this.db, candidate);
      const [hasIdentity, verified] = await this.chaindata.hasIdentity(stash);
      if (!hasIdentity) {
        return [false, `${name} does not have an identity set.`];
      }
      if (!verified) {
        return [
          false,
          `${name} has an identity but is not verified by registrar.`,
        ];
      }

      // const idString = await this.chaindata.getIdentity(stash);
      // const idHash = blake2AsHex(idString);
      // const numIds = identityHashTable.get(idHash) || 0;
      // if (!numIds || numIds > 2) {
      //   return [
      //     false,
      //     `${name} has too many candidates in the set with same identity. Number: ${numIds} Hash: ${idHash}`,
      //   ];
      // }
    }

    // Ensures node has 98% up time.
    await checkOffline(this.db, candidate);
    const totalOffline = offlineAccumulated / WEEK;
    if (totalOffline > 0.02) {
      return [
        false,
        `${name} has been offline ${
          offlineAccumulated / 1000 / 60
        } minutes this week.`,
      ];
    }

    // Ensure that the reward destination is set to 'Staked'
    if (!this.skipStakedDesitnation) {
      await checkRewardDestination(this.db, this.chaindata, candidate);
      const isStaked = await this.chaindata.destinationIsStaked(stash);
      if (!isStaked) {
        const reason = `${name} does not have reward destination set to Staked`;
        return [false, reason];
      }
    }

    // Ensure that the commission is in line with the network rules
    await checkCommission(this.db, this.chaindata, this.commission, candidate);
    const [commission, err] = await this.chaindata.getCommission(stash);
    if (err) {
      return [false, `${name} ${err}`];
    }
    if (commission > this.commission) {
      return [
        false,
        `${name} commission is set higher than the maximum allowed. Set: ${commission} Allowed: ${this.commission}`,
      ];
    }

    if (!skipSelfStake) {
      const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
      if (err2) {
        return [false, `${name} ${err2}`];
      }

      if (bondedAmt < this.minSelfStake) {
        return [
          false,
          `${name} has less than the minimum amount bonded: ${bondedAmt} is bonded.`,
        ];
      }
    }

    if (!this.skipUnclaimed) {
      const [currentEra, err3] = await this.chaindata.getActiveEraIndex();
      const threshold = currentEra - this.unclaimedEraThreshold - 1; // Validators cannot have unclaimed rewards before this era
      // If unclaimed eras contain an era below the recent threshold
      if (unclaimedEras && !unclaimedEras.every((era) => era > threshold)) {
        return [
          false,
          `${name} has unclaimed eras: ${unclaimedEras} prior to era: ${
            threshold + 1
          }`,
        ];
      }
    }

    try {
      if (!!kusamaStash) {
        const url = `${KOTVBackendEndpoint}/candidate/${kusamaStash}`;

        const res = await axios.get(url);

        if (!!res.data.invalidityReasons) {
          return [
            false,
            `${name} has a kusama node that is invalid: ${res.data.invalidityReasons}`,
          ];
        }

        if (Number(res.data.rank) < 25) {
          return [
            false,
            `${name} has a Kusama stash with lower than 25 rank in the Kusama OTV programme: ${res.data.rank}.`,
          ];
        }
      }
    } catch (e) {
      logger.info(`Error trying to get kusama data...`);
    }

    return [true, ""];
  }

  // Returns the list of valid candidates, ordered by the priority they should get nominated in
  async getValidCandidates(
    candidates: CandidateData[],
    db: Db
  ): Promise<CandidateData[]> {
    logger.info(`(OTV::getValidCandidates) Getting candidates`);

    const validCandidates = [];
    let rankedCandidates = [];
    for (const candidate of candidates) {
      const [isValid, reason] = await this.checkSingleCandidate(candidate);

      if (!isValid) {
        logger.info(reason);
        await db.setInvalidityReason(candidate.stash, reason);
        continue;
      }
      await db.setInvalidityReason(candidate.stash, "");

      validCandidates.push(candidate);
    }

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemd valid

    // Bonded
    const bondedValues = validCandidates.map((candidate) => {
      return candidate.bonded ? candidate.bonded : 0;
    });
    const bondedStats = getStats(bondedValues);

    // Faults
    const faultsValues = validCandidates.map((candidate) => {
      return candidate.faults ? candidate.faults : 0;
    });
    const faultsStats = getStats(faultsValues);

    //  Inclusion
    const inclusionValues = validCandidates.map((candidate) => {
      return candidate.inclusion ? candidate.inclusion : 0;
    });
    const inclusionStats = getStats(inclusionValues);

    // Span Inclusion
    const spanInclusionValues = validCandidates.map((candidate) => {
      return candidate.spanInclusion ? candidate.spanInclusion : 0;
    });
    const spanInclusionStats = getStats(spanInclusionValues);

    // Discovered At
    const discoveredAtValues = validCandidates.map((candidate) => {
      return candidate.discoveredAt ? candidate.discoveredAt : 0;
    });
    const discoveredAtStats = getStats(discoveredAtValues);

    // Nominated At
    const nominatedAtValues = validCandidates.map((candidate) => {
      return candidate.nominatedAt ? candidate.nominatedAt : 0;
    });
    const nominatedAtStats = getStats(nominatedAtValues);

    // Downtime
    const offlineValues = validCandidates.map((candidate) => {
      return candidate.offlineAccumulated ? candidate.offlineAccumulated : 0;
    });
    const offlineStats = getStats(offlineValues);

    // Rank
    const rankValues = validCandidates.map((candidate) => {
      return candidate.rank ? candidate.rank : 0;
    });
    const rankStats = getStats(rankValues);

    // Unclaimed Rewards
    const unclaimedValues = validCandidates.map((candidate) => {
      return candidate.unclaimedEras && candidate.unclaimedEras.length
        ? candidate.unclaimedEras.length
        : 0;
    });
    const unclaimedStats = getStats(unclaimedValues);

    // Create DB entry for Validator Score Metadata
    await db.setValidatorScoreMetadata(
      bondedStats,
      this.BONDED_WEIGHT,
      faultsStats,
      this.FAULTS_WEIGHT,
      inclusionStats,
      this.INCLUSION_WEIGHT,
      spanInclusionStats,
      this.SPAN_INCLUSION_WEIGHT,
      discoveredAtStats,
      this.DISCOVERED_WEIGHT,
      nominatedAtStats,
      this.NOMINATED_WEIGHT,
      offlineStats,
      this.OFFLINE_WEIGHT,
      rankStats,
      this.RANK_WEIGHT,
      unclaimedStats,
      this.UNCLAIMED_WEIGHT,
      Date.now()
    );

    for (const candidate of validCandidates) {
      const scaledInclusion = scaled(candidate.inclusion, inclusionValues);
      const inclusionScore = (1 - scaledInclusion) * this.INCLUSION_WEIGHT;

      const scaledSpanInclusion = scaled(
        candidate.spanInclusion,
        spanInclusionValues
      );
      const spanInclusionScore =
        (1 - scaledSpanInclusion) * this.SPAN_INCLUSION_WEIGHT;

      const scaledDiscovered = scaled(
        candidate.discoveredAt,
        discoveredAtValues
      );
      const discoveredScore = (1 - scaledDiscovered) * this.DISCOVERED_WEIGHT;

      const scaledNominated = scaled(candidate.nominatedAt, nominatedAtValues);
      const nominatedScore = (1 - scaledNominated) * this.NOMINATED_WEIGHT;

      const scaledRank = scaled(candidate.rank, rankValues);
      const rankScore = scaledRank * this.RANK_WEIGHT;

      const scaledUnclaimed = candidate.unclaimedEras
        ? scaled(candidate.unclaimedEras.length, unclaimedValues)
        : 0;
      const unclaimedScore = (1 - scaledUnclaimed) * this.UNCLAIMED_WEIGHT;

      const scaledBonded = scaled(candidate.bonded, bondedValues);
      const bondedScore = scaledBonded ? scaledBonded * this.BONDED_WEIGHT : 0;

      const scaledOffline = scaled(candidate.offlineAccumulated, offlineValues);
      const offlineScore = (1 - scaledOffline) * this.OFFLINE_WEIGHT;

      const scaledFaults = scaled(candidate.faults, faultsValues);
      const faultsScore = (1 - scaledFaults) * this.FAULTS_WEIGHT;

      const aggregate =
        inclusionScore +
        spanInclusionScore +
        faultsScore +
        discoveredScore +
        nominatedScore +
        rankScore +
        unclaimedScore +
        bondedScore +
        offlineScore;

      const randomness = 1 + Math.random() * 0.05;

      const score = {
        total: aggregate * randomness,
        aggregate: aggregate,
        inclusion: inclusionScore,
        spanInclusion: spanInclusionScore,
        discovered: discoveredScore,
        nominated: nominatedScore,
        rank: rankScore,
        unclaimed: unclaimedScore,
        bonded: bondedScore,
        faults: faultsScore,
        offline: offlineScore,
        randomness: randomness,
        updated: Date.now(),
      };

      await db.setValidatorScore(
        candidate.stash,
        score.updated,
        score.total,
        score.aggregate,
        score.inclusion,
        score.spanInclusion,
        score.discovered,
        score.nominated,
        score.rank,
        score.unclaimed,
        score.bonded,
        score.faults,
        score.offline,
        score.randomness
      );

      const rankedCandidate = {
        aggregate: score,
        discoveredAt: candidate.discoveredAt,
        rank: candidate.rank,
        unclaimedEras: candidate.unclaimedEras,
        inclusion: candidate.inclusion,
        spanInclusion: candidate.spanInclusion,
        name: candidate.name,
        stash: candidate.stash,
        identity: candidate.identity,
        nominatedAt: candidate.nominatedAt,
        bonded: candidate.bonded,
      };
      rankedCandidates.push(rankedCandidate);
    }

    rankedCandidates = rankedCandidates.sort((a, b) => {
      return b.aggregate.total - a.aggregate.total;
    });

    // Cache the value to return from the server.
    this.validCache = rankedCandidates;

    return rankedCandidates;
  }

  // Weighted scores
  // Discovered at - earlier is preferrable
  // Nominated At - Not nominated in a while is preferrable
  // offlineAccumulated - lower if prefferable
  // rank - higher is preferrable
  // faults - lower is preferrable
  // unclaimed eras - lower is preferrable
  // inclusion - lower is preferrable
  // bonded - higher is preferrable
  INCLUSION_WEIGHT = 5;
  SPAN_INCLUSION_WEIGHT = 40;
  DISCOVERED_WEIGHT = 5;
  NOMINATED_WEIGHT = 35;
  RANK_WEIGHT = 5;
  UNCLAIMED_WEIGHT = 15;
  BONDED_WEIGHT = 13;
  FAULTS_WEIGHT = 5;
  OFFLINE_WEIGHT = 2;

  /// At the end of a nomination round this is the logic that separates the
  /// candidates that did good from the ones that did badly.
  /// - We have two sets, a 'good' set, and a 'bad' set
  ///     - We go through all the candidates and if they meet all constraints, they get alled to the 'good' set
  ///     - If they do not meet all the constraints, they get added to the bad set
  async processCandidates(
    candidates: Set<CandidateData>
  ): Promise<
    [Set<CandidateData>, Set<{ candidate: CandidateData; reason: string }>]
  > {
    logger.info(`(OTV::processCandidates) Processing candidates`);

    const [activeEraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }

    const good: Set<CandidateData> = new Set();
    const bad: Set<{ candidate: CandidateData; reason: string }> = new Set();

    for (const candidate of candidates) {
      if (!candidate) {
        logger.info(
          `{Constraints::processCandidates} candidate is null. Skipping..`
        );
        continue;
      }
      const {
        name,
        offlineSince,
        stash,
        skipSelfStake,
        offlineAccumulated,
        unclaimedEras,
      } = candidate;
      /// Ensure the commission wasn't raised/
      const [commission, err] = await this.chaindata.getCommission(stash);
      /// If it errors we assume that a validator removed their validator status.
      if (err) {
        const reason = `${name} ${err}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      if (commission > this.commission) {
        const reason = `${name} found commission higher than ten percent: ${commission}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      if (!skipSelfStake) {
        const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
        if (err2) {
          const reason = `${name} ${err2}`;
          logger.info(reason);
          bad.add({ candidate, reason });
          continue;
        }
        if (bondedAmt < this.minSelfStake) {
          const reason = `${name} has less than the minimum required amount bonded: ${bondedAmt}`;
          logger.info(reason);
          bad.add({ candidate, reason });
          continue;
        }
      }

      if (!this.skipStakedDesitnation) {
        const isStaked = await this.chaindata.destinationIsStaked(stash);
        if (!isStaked) {
          const reason = `${name} does not have reward destination set to Staked`;
          bad.add({ candidate, reason });
          continue;
        }
      }

      // Ensure the candidate doesn't have too much offline time
      const totalOffline = offlineAccumulated / WEEK;
      if (totalOffline > 0.02) {
        const reason = `${name} has been offline ${
          offlineAccumulated / 1000 / 60
        } minutes this week.`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      // Checking for slashing should be temporarily removed - since slashes can be cancelled by governance they should be handled manually.

      // const [hasSlashes, err3] = await this.chaindata.hasUnappliedSlashes(
      //   activeEraIndex - 2,
      //   activeEraIndex,
      //   stash
      // );
      // if (err3) {
      //   const reason = `${name} ${err3}`;
      //   logger.info(reason);
      //   bad.add({ candidate, reason });
      //   continue;
      // }
      // if (hasSlashes) {
      //   const reason = `${name} has slashes.`;
      //   logger.info(reason);
      //   bad.add({ candidate, reason });
      //   continue;
      // }

      good.add(candidate);
    }
    return [good, bad];
  }
}

// Checks the online validity of a node
export const checkOnline = async (db: Db, candidate: any) => {
  if (
    (candidate && Number(candidate.onlineSince) === 0) ||
    Number(candidate.offlineSince) !== 0
  ) {
    await db.setOnlineValidity(candidate.stash, false);
    return false;
  } else {
    await db.setOnlineValidity(candidate.stash, true);
    return true;
  }
};

// Check the validate intention for a single validator
export const checkValidateIntention = async (
  config: Config,
  chaindata: ChainData,
  db: Db,
  candidate: any
) => {
  const validators = await chaindata.getValidators();
  if (!validators.includes(formatAddress(candidate.stash, config))) {
    db.setValidateIntentionValidity(candidate.stash, false);
    return false;
  } else {
    db.setValidateIntentionValidity(candidate.stash, true);
    return true;
  }
};

// checks the validate intention for all validators
export const checkAllValidateIntentions = async (
  config: Config,
  chaindata: ChainData,
  db: Db,
  candidates: any
) => {
  const validators = await chaindata.getValidators();
  for (const candidate of candidates) {
    if (!validators.includes(formatAddress(candidate.stash, config))) {
      db.setValidateIntentionValidity(candidate.stash, false);
    } else {
      db.setValidateIntentionValidity(candidate.stash, true);
    }
  }
};

// checks that the validator is on the latest client version
export const checkLatestClientVersion = async (
  config: Config,
  db: Db,
  candidate: any
) => {
  if (!config.constraints.skipClientUpgrade) {
    const latestRelease = await db.getLatestRelease();
    if (latestRelease) {
      const nodeVersion = semver.coerce(candidate.version);
      const latestVersion = semver.clean(latestRelease.name);
      const isUpgraded = semver.gte(nodeVersion, latestVersion);
      if (!isUpgraded) {
        db.setLatestClientReleaseValidity(candidate.stash, false);
        return false;
      } else {
        db.setLatestClientReleaseValidity(candidate.stash, true);
        return true;
      }
    }
  }
};

export const checkConnectionTime = async (
  config: Config,
  db: Db,
  candidate: any
) => {
  if (!config.constraints.skipConnectionTime) {
    const now = new Date().getTime();
    if (now - candidate.discoveredAt < WEEK) {
      db.setConnectionTimeInvalidity(candidate.stash, false);
      return false;
    } else {
      db.setConnectionTimeInvalidity(candidate.stash, true);
      return true;
    }
  }
};

export const checkIdentity = async (
  chaindata: ChainData,
  db: Db,
  candidate: any
) => {
  const [hasIdentity, verified] = await chaindata.hasIdentity(candidate.stash);
  if (!hasIdentity) {
    const invalidityString = `${candidate.name} does not have an identity set.`;
    db.setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  if (!verified) {
    const invalidityString = `${candidate.name} has an identity but is not verified by registrar.`;
    db.setIdentityInvalidity(candidate.stash, false, invalidityString);
    return false;
  }
  db.setIdentityInvalidity(candidate.stash, true);
  return true;
};

export const checkOffline = async (db: Db, candidate: any) => {
  const totalOffline = candidate.offlineAccumulated / WEEK;
  if (totalOffline > 0.02) {
    db.setOfflineAccumulatedInvalidity(candidate.stash, false);
    return false;
  } else {
    db.setOfflineAccumulatedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkRewardDestination = async (
  db: Db,
  chaindata: ChainData,
  candidate: any
) => {
  const isStaked = await chaindata.destinationIsStaked(candidate.stash);
  if (!isStaked) {
    await db.setRewardDestinationInvalidity(candidate.stash, false);
    return false;
  } else {
    await db.setRewardDestinationInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkCommission = async (
  db: Db,
  chaindata: ChainData,
  targetCommission: number,
  candidate: any
) => {
  const [commission, err] = await chaindata.getCommission(candidate.stash);
  if (err) {
    logger.warn(`{CheckComssion} there was an error: ${err}`);
    return false;
  }
  if (commission > targetCommission) {
    const invalidityString = `${
      candidate.name
    } commission is set higher than the maximum allowed. Set: ${
      commission / Math.pow(10, 7)
    }% Allowed: ${targetCommission / Math.pow(10, 7)}%`;
    db.setCommissionInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    db.setCommissionInvalidity(candidate.stash, true);
    return true;
  }
};
