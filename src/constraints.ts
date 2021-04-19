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

export interface Constraints {
  getValidCandidates(
    candidates: any[],
    identityHashTable: Map<string, number>,
    db: Db
  ): Promise<any[]>;
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
    config: Config
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
    candidates: CandidateData[],
    identityHashTable: Map<string, number>
  ): Promise<{ stash: string; reason: string }[]> {
    let invalid = await Promise.all(
      candidates.map(async (candidate) => {
        const { stash } = candidate;
        const [isValid, reason] = await this.checkSingleCandidate(
          candidate,
          identityHashTable
        );
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
    candidate: CandidateData,
    identityHashTable: Map<string, number>
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
    if (onlineSince === 0 || offlineSince !== 0) {
      return [false, `${name} offline. Offline since ${offlineSince}.`];
    }

    // Check that the validator has a validate intention
    const validators = await this.chaindata.getValidators();
    if (!validators.includes(formatAddress(stash, this.config))) {
      return [false, `${name} does not have a validate intention`];
    }

    // Only take nodes that have been upgraded to latest versions.
    if (!updated && !this.skipClientUpgrade) {
      return [false, `${name} is not running the latest client code.`];
    }

    // Ensure the node has been connected for a minimum of one week.
    if (!this.skipConnectionTime) {
      const now = new Date().getTime();
      if (now - discoveredAt < WEEK) {
        return [false, `${name} hasn't been connected for minimum length.`];
      }
    }

    // Ensure the validator stash has an identity set.
    if (!this.skipIdentity) {
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

      const idString = await this.chaindata.getIdentity(stash);
      const idHash = blake2AsHex(idString);
      const numIds = identityHashTable.get(idHash) || 0;
      if (!numIds || numIds > 2) {
        return [
          false,
          `${name} has too many candidates in the set with same identity. Number: ${numIds} Hash: ${idHash}`,
        ];
      }
    }

    // Ensures node has 98% up time.
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
      const isStaked = await this.chaindata.destinationIsStaked(stash);
      if (!isStaked) {
        const reason = `${name} does not have reward destination set to Staked`;
        return [false, reason];
      }
    }

    // Ensure that the commission is in line with the network rules
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
      if (!unclaimedEras.every((era) => era > threshold)) {
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
    identityHashTable: Map<string, number>,
    db: Db
  ): Promise<CandidateData[]> {
    logger.info(`(OTV::getValidCandidates) Getting candidates`);

    const validCandidates = [];
    let rankedCandidates = [];
    for (const candidate of candidates) {
      const [isValid, reason] = await this.checkSingleCandidate(
        candidate,
        identityHashTable
      );

      if (!isValid) {
        logger.info(reason);
        continue;
      }

      validCandidates.push(candidate);
    }

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemd valid

    // Bonded
    const minBonded = validCandidates.reduce((prev, curr) =>
      prev.bonded < curr.bonded ? prev : curr
    );
    const maxBonded = validCandidates.reduce((prev, curr) =>
      prev.bonded > curr.bonded ? prev : curr
    );

    // Faults
    const minFaults = validCandidates.reduce((prev, curr) =>
      prev.faults < curr.faults ? prev : curr
    );
    const maxFaults = validCandidates.reduce((prev, curr) =>
      prev.faults > curr.faults ? prev : curr
    );

    // Span Inclusion
    const minInclusion = validCandidates.reduce((prev, curr) =>
      prev.spanInclusion < curr.spanInclusion ? prev : curr
    );
    const maxInclusion = validCandidates.reduce((prev, curr) =>
      prev.spanInclusion > curr.spanInclusion ? prev : curr
    );

    // Discovered At
    const minDiscoveredAt = validCandidates.reduce((prev, curr) =>
      prev.discoveredAt < curr.discoveredAt ? prev : curr
    );
    const maxDiscoveredAt = validCandidates.reduce((prev, curr) =>
      prev.discoveredAt > curr.discoveredAt ? prev : curr
    );

    // Nominated At
    const minNominatedAt = validCandidates
      .filter((v) => v.nominatedAt > 0)
      .reduce(
        (prev, curr) => (prev.nominatedAt < curr.nominatedAt ? prev : curr),
        0
      );
    const maxNominatedAt = validCandidates.reduce((prev, curr) =>
      prev.nominatedAt > curr.nominatedAt ? prev : curr
    );

    // Downtime
    const minOffline = validCandidates.reduce((prev, curr) =>
      prev.offlineAccumulated < curr.offlineAccumulated ? prev : curr
    );
    const maxOffline = validCandidates.reduce((prev, curr) =>
      prev.offlineAccumulated > curr.offlineAccumulated ? prev : curr
    );

    // Rank
    const minRank = validCandidates.reduce((prev, curr) =>
      prev.rank < curr.rank ? prev : curr
    );
    const maxRank = validCandidates.reduce((prev, curr) =>
      prev.rank > curr.rank ? prev : curr
    );

    // Unclaimed Rewards
    const minUnclaimed = validCandidates.reduce((prev, curr) =>
      prev.unclaimedEras.length < curr.unclaimedEras.length ? prev : curr
    );
    const maxUnclaimed = validCandidates.reduce((prev, curr) =>
      prev.unclaimedEras.length > curr.unclaimedEras.length ? prev : curr
    );

    // Create DB entry for Validator Score Metadata
    await db.setValidatorScoreMetadata(
      minBonded.bonded,
      maxBonded.bonded,
      this.BONDED_WEIGHT,
      minFaults.faults,
      maxFaults.faults,
      this.FAULTS_WEIGHT,
      minInclusion.spanInclusion,
      maxInclusion.spanInclusion,
      this.INCLUSION_WEIGHT,
      minDiscoveredAt.discoveredAt,
      maxDiscoveredAt.discoveredAt,
      this.DISCOVERED_WEIGHT,
      minNominatedAt.nominatedAt,
      maxNominatedAt.nominatedAt,
      this.NOMINATED_WEIGHT,
      minOffline.offlineAccumulated,
      maxOffline.offlineAccumulated,
      this.OFFLINE_WEIGHT,
      minRank.rank,
      maxRank.rank,
      this.RANK_WEIGHT,
      minUnclaimed.unclaimedEras.length,
      maxUnclaimed.unclaimedEras.length,
      this.UNCLAIMED_WEIGHT,
      Date.now()
    );

    for (const candidate of validCandidates) {
      const scaledInclusion = this.scaleInclusion(
        candidate.spanInclusion,
        minInclusion.spanInclusion,
        maxInclusion.spanInclusion
      );
      const inclusionScore = scaledInclusion * this.INCLUSION_WEIGHT;

      const scaledDiscovered = this.scaleDiscovered(
        candidate.discoveredAt,
        minDiscoveredAt.discoveredAt,
        maxDiscoveredAt.discoveredAt
      );
      const discoveredScore = scaledDiscovered * this.DISCOVERED_WEIGHT;

      // If the candidate was just added (their nominatedAt is 0), give them the full weight
      const scaledNominated = this.scaleNominated(
        candidate.nominatedAt,
        minNominatedAt.nominatedAt,
        maxNominatedAt.nominatedAt
      );
      const nominatedScore =
        candidate.nominatedAt == 0
          ? this.NOMINATED_WEIGHT
          : scaledNominated * this.NOMINATED_WEIGHT;

      const scaledRank = this.scaleRank(
        candidate.rank,
        minRank.rank,
        maxRank.rank
      );
      const rankScore = scaledRank * this.RANK_WEIGHT;

      const scaledUnclaimed = this.scaleUnclaimed(
        candidate.unclaimedEras.length,
        minUnclaimed.unclaimedEras.length,
        maxUnclaimed.unclaimedEras.length
      );
      const unclaimedScore = scaledUnclaimed * this.UNCLAIMED_WEIGHT;

      const scaledBonded = this.scaleBonded(
        candidate.bonded,
        minBonded.bonded,
        maxBonded.bonded
      );
      const bondedScore = scaledBonded * this.BONDED_WEIGHT;

      const scaledOffline = this.scaleOffline(
        candidate.offlineAccumulated,
        minOffline.offlineAccumulated,
        maxOffline.offlineAccumulated
      );
      const offlineScore = scaledOffline * this.OFFLINE_WEIGHT;

      const scaledFaults = this.scaleFaults(
        candidate.faults,
        minFaults.faults,
        maxFaults.faults
      );
      const faultsScore = scaledFaults * this.FAULTS_WEIGHT;

      const aggregate =
        inclusionScore +
        discoveredScore +
        nominatedScore +
        rankScore +
        unclaimedScore +
        bondedScore;

      const randomness = 1 + Math.random() * 0.05;

      const score = {
        total: aggregate * randomness,
        aggregate: aggregate,
        inclusion: inclusionScore,
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
  INCLUSION_WEIGHT = 40;
  DISCOVERED_WEIGHT = 5;
  NOMINATED_WEIGHT = 35;
  RANK_WEIGHT = 5;
  UNCLAIMED_WEIGHT = 15;
  BONDED_WEIGHT = 5;
  FAULTS_WEIGHT = 10;
  OFFLINE_WEIGHT = 5;

  scaleBonded(candidateBonded, minBonded, maxBonded) {
    if (minBonded == maxBonded) return 1;
    return (candidateBonded - minBonded) / (maxBonded - minBonded);
  }

  scaleOffline(candidateOffline, minOffline, maxOffline) {
    if (minOffline == maxOffline) return 1;
    return (maxOffline - candidateOffline) / (maxOffline - minOffline);
  }

  scaleInclusion(candidateInclusion, minInclusion, maxInclusion) {
    if (minInclusion == maxInclusion) return 1;
    return (maxInclusion - candidateInclusion) / (maxInclusion - minInclusion);
  }

  scaleDiscovered(candidateDiscovered, minDiscovered, maxDiscovered) {
    if (minDiscovered == maxDiscovered) return 1;
    return (
      (maxDiscovered - candidateDiscovered) / (maxDiscovered - minDiscovered)
    );
  }

  scaleNominated(candidateNominated, minNominated, maxNominated) {
    if (minNominated == maxNominated) return 1;
    return (maxNominated - candidateNominated) / (maxNominated - minNominated);
  }

  scaleRank(candidateRank, minRank, maxRank) {
    if (minRank == maxRank) return 1;
    return (candidateRank - minRank) / (maxRank - minRank);
  }

  scaleFaults(candidateFaults, minFaults, maxFaults) {
    if (minFaults == maxFaults) return 1;
    return (maxFaults - candidateFaults) / (maxFaults - minFaults);
  }

  scaleUnclaimed(candidateUnclaimed, minUnclaimed, maxUnclaimed) {
    if (minUnclaimed == maxUnclaimed) return 1;
    return (maxUnclaimed - candidateUnclaimed) / (maxUnclaimed - minUnclaimed);
  }

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
