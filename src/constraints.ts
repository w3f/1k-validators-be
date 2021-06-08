import { blake2AsHex } from "@polkadot/util-crypto";

import ApiHandler from "./ApiHandler";
import ChainData from "./chaindata";
import { WEEK, KOTVBackendEndpoint, SIXTEEN_HOURS } from "./constants";
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
  // TODO: Remove
  private validCache: CandidateData[] = [];
  private invalidCache: CandidateData[] = [];

  // Caches - keyed by stash address
  private validMapCache: Map<string, CandidateData> = new Map();
  private invalidMapCache: Map<string, CandidateData> = new Map();

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

  get invalidCandidateCache(): CandidateData[] {
    return this.invalidCache;
  }

  // Add candidate to valid cache and remove them from invalid cache
  addToValidCache(address: string, candidate: CandidateData) {
    if (this.invalidMapCache.has(address)) {
      this.invalidMapCache.delete(address);
    }

    if (this.validMapCache.has(address)) {
      return;
    } else {
      this.validMapCache.set(address, candidate);
    }
  }

  // Add candidate to valid cache and remove them from invalid cache
  addToInvalidCache(address: string, candidate: CandidateData) {
    if (this.validMapCache.has(address)) {
      this.validMapCache.delete(address);
    }

    if (this.invalidMapCache.has(address)) {
      return;
    } else {
      this.invalidMapCache.set(address, candidate);
    }
  }

  async checkCandidateStash(address: string): Promise<boolean> {
    const candidate = await this.db.getCandidate(address);
    return await this.checkCandidate(candidate);
  }

  // Check the candidate and set any invalidity fields
  async checkCandidate(candidate: CandidateData): Promise<boolean> {
    let valid = false;

    const onlineValid = await checkOnline(this.db, candidate);

    logger.info(
      `{checkCandidate} ${candidate.name} online valid: ${onlineValid}`
    );

    const validateValid = await checkValidateIntention(
      this.config,
      this.chaindata,
      this.db,
      candidate
    );

    logger.info(
      `{checkCandidate} ${candidate.name} validate valid: ${validateValid}`
    );

    const versionValid = await checkLatestClientVersion(
      this.config,
      this.db,
      candidate
    );

    logger.info(
      `{checkCandidate} ${candidate.name} versionValid: ${versionValid}`
    );

    const monitoringWeekValid = await checkConnectionTime(
      this.config,
      this.db,
      candidate
    );

    logger.info(
      `{checkCandidate} ${candidate.name} monitoringWeekValid: ${monitoringWeekValid}`
    );

    const identityValid = await checkIdentity(
      this.chaindata,
      this.db,
      candidate
    );

    logger.info(
      `{checkCandidate} ${candidate.name} identityValid: ${identityValid}`
    );

    const offlineValid = await checkOffline(this.db, candidate);

    logger.info(
      `{checkCandidate} ${candidate.name} offlineValid: ${offlineValid}`
    );

    let rewardDestinationValid = true;
    if (!this.skipStakedDesitnation) {
      rewardDestinationValid =
        (await checkRewardDestination(this.db, this.chaindata, candidate)) ||
        false;
    }

    logger.info(
      `{checkCandidate} ${candidate.name} rewardDestinationValid: ${rewardDestinationValid}`
    );

    const commissionValid =
      (await checkCommission(
        this.db,
        this.chaindata,
        this.commission,
        candidate
      )) || false;

    logger.info(
      `{checkCandidate} ${candidate.name} commissionValid: ${commissionValid}`
    );

    const selfStakeValid =
      (await checkSelfStake(
        this.db,
        this.chaindata,
        this.minSelfStake,
        candidate
      )) || false;

    logger.info(
      `{checkCandidate} ${candidate.name} selfStakeValid: ${selfStakeValid}`
    );

    const unclaimedValid =
      (await checkUnclaimed(
        this.db,
        this.chaindata,
        this.unclaimedEraThreshold,
        candidate
      )) || false;

    logger.info(
      `{checkCandidate} ${candidate.name} unclaimedValid: ${unclaimedValid}`
    );

    let kusamaValid = true;
    try {
      if (!!candidate.kusamaStash) {
        kusamaValid = (await checkKusamaRank(this.db, candidate)) || false;
      }
    } catch (e) {
      logger.info(`Error trying to get kusama data...`);
    }

    logger.info(
      `{checkCandidate} ${candidate.name} kusamaValid: ${kusamaValid}`
    );

    valid =
      onlineValid &&
      validateValid &&
      versionValid &&
      monitoringWeekValid &&
      identityValid &&
      offlineValid &&
      rewardDestinationValid &&
      commissionValid &&
      selfStakeValid &&
      unclaimedValid &&
      kusamaValid;

    logger.info(`{checkCandidate} ${candidate.name} is ${valid}`);

    await this.db.setValid(candidate.stash, valid);

    if (valid) {
      this.addToValidCache(candidate.stash, candidate);
      this.db.setLastValid(candidate.stash);
    } else {
      this.addToInvalidCache(candidate.stash, candidate);
    }

    return valid;
  }

  async scoreAllCandidates() {
    const candidates = await this.db.allCandidates();
    await this.scoreCandidates(candidates, this.db);
  }

  async scoreCandidates(candidates: CandidateData[], db: Db) {
    let rankedCandidates = [];
    const validCandidates = candidates.filter((candidate) => candidate.valid);
    if (validCandidates.length < 2) return;

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemd valid

    // Bonded
    const bondedValues = validCandidates.map((candidate) => {
      return candidate.bonded ? candidate.bonded : 0;
    });
    const bondedStats = bondedValues.length > 0 ? getStats(bondedValues) : [];

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
      const bondedScore = scaledBonded * this.BONDED_WEIGHT;

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
  if (!validators.includes(formatAddress(candidate?.stash, config))) {
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
    if (latestRelease && Date.now > latestRelease.publishedAt + SIXTEEN_HOURS) {
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
  } else {
    db.setLatestClientReleaseValidity(candidate.stash, true);
    return true;
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
  } else {
    db.setConnectionTimeInvalidity(candidate.stash, true);
    return true;
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

export const checkSelfStake = async (
  db: Db,
  chaindata: ChainData,
  targetSelfStake: number,
  candidate: any
) => {
  if (!candidate.skipSelfStake) {
    const [bondedAmt, err2] = await chaindata.getBondedAmount(candidate.stash);
    let invalidityString;
    if (err2) {
      invalidityString = `${candidate.name} ${err2}`;
      await db.setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }

    if (bondedAmt < targetSelfStake) {
      invalidityString = `${candidate.name} has less than the minimum amount bonded: ${bondedAmt} is bonded.`;
      await db.setSelfStakeInvalidity(candidate.stash, false, invalidityString);
      return false;
    }
  }
  await db.setSelfStakeInvalidity(candidate.stash, true);
  return true;
};

export const checkUnclaimed = async (
  db: Db,
  chaindata: ChainData,
  unclaimedEraThreshold: number,
  candidate: any
) => {
  const [currentEra, err3] = await chaindata.getActiveEraIndex();
  const threshold = currentEra - unclaimedEraThreshold - 1; // Validators cannot have unclaimed rewards before this era
  // If unclaimed eras contain an era below the recent threshold
  if (
    candidate.unclaimedEras &&
    !candidate.unclaimedEras.every((era) => era > threshold)
  ) {
    const invalidityString = `${candidate.name} has unclaimed eras: ${
      candidate.unclaimedEras
    } prior to era: ${threshold + 1}`;
    await db.setUnclaimedInvalidity(candidate.stash, false, invalidityString);
    return false;
  } else {
    await db.setUnclaimedInvalidity(candidate.stash, true);
    return true;
  }
};

export const checkKusamaRank = async (db: Db, candidate: any) => {
  try {
    if (!!candidate.kusamaStash) {
      const url = `${KOTVBackendEndpoint}/candidate/${candidate.kusamaStash}`;

      const res = await axios.get(url);

      if (!!res.data.invalidityReasons) {
        const invalidityReason = `${candidate.name} has a kusama node that is invalid: ${res.data.invalidityReasons}`;
        await db.setKusamaRankInvalidity(
          candidate.stash,
          false,
          invalidityReason
        );
        return false;
      }

      if (Number(res.data.rank) < 25) {
        const invalidityReason = `${candidate.name} has a Kusama stash with lower than 25 rank in the Kusama OTV programme: ${res.data.rank}.`;
        await db.setKusamaRankInvalidity(
          candidate.stash,
          false,
          invalidityReason
        );
        return false;
      }
    }
    await db.setKusamaRankInvalidity(candidate.stash, true);
    return true;
  } catch (e) {
    logger.info(`Error trying to get kusama data...`);
  }
};
