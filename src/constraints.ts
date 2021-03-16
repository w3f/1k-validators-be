import { blake2AsHex } from "@polkadot/util-crypto";

import ApiHandler from "./ApiHandler";
import ChainData from "./chaindata";
import { WEEK, KOTVBackendEndpoint } from "./constants";
import logger from "./logger";
import { CandidateData } from "./types";
import axios from "axios";

export interface Constraints {
  getValidCandidates(
    candidates: any[],
    identityHashTable: Map<string, number>
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

  // configurable constants
  private minSelfStake: number;
  private commission: number;
  private unclaimedEraThreshold: number;

  // caches
  private validCache: CandidateData[] = [];
  private invalidCache: string[] = [];

  constructor(
    handler: ApiHandler,
    skipConnectionTime = false,
    skipIdentity = false,
    skipStakedDestination = false,
    skipClientUpgrade = false,
    minSelfStake = 0,
    commission = 0,
    unclaimedEraThreshold = 0
  ) {
    this.chaindata = new ChainData(handler);

    this.skipConnectionTime = skipConnectionTime;
    this.skipIdentity = skipIdentity;
    this.skipStakedDesitnation = skipStakedDestination;
    this.skipClientUpgrade = skipClientUpgrade;

    this.minSelfStake = minSelfStake;
    this.commission = commission;
    this.unclaimedEraThreshold = unclaimedEraThreshold;
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

    // const unclaimedEras = await this.chaindata.getUnclaimedEras(stash);
    const [currentEra, err3] = await this.chaindata.getActiveEraIndex();
    const threshold = currentEra - this.unclaimedEraThreshold - 1; // Validators cannot have unclaimed rewards before this era
    // If unclaimed eras contain an era below the recent threshold
    if (!unclaimedEras.every((era) => era > threshold)) {
      return [
        false,
        `${stash} has unclaimed eras: ${unclaimedEras} prior to era: ${
          threshold + 1
        }`,
      ];
    }

    try {
      if (!!kusamaStash) {
        const url = `${KOTVBackendEndpoint}/candidate/${kusamaStash}`;

        const res = await axios.get(url);

        if (!!res.data.invalidityResasons) {
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
      console.error(e);
    }

    return [true, ""];
  }

  // Returns the list of valid candidates, ordered by the priority they should get nominated in
  async getValidCandidates(
    candidates: CandidateData[],
    identityHashTable: Map<string, number>
  ): Promise<CandidateData[]> {
    logger.info(`(OTV::getValidCandidates) Getting candidates`);

    let validCandidates = [];
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

    // When valid candidates are collected, now it sorts them in priority.

    // Sort by earliest connected.
    validCandidates = validCandidates.sort(
      (a: CandidateData, b: CandidateData) => {
        return a.discoveredAt - b.discoveredAt;
      }
    );

    // Sort so the ones who nominated most recently are less prioritized.
    validCandidates = validCandidates.sort(
      (a: CandidateData, b: CandidateData) => {
        return a.nominatedAt - b.nominatedAt;
      }
    );

    // Sort so that validators with few unclaimed payouts are prioritized
    validCandidates = validCandidates.sort(
      (a: CandidateData, b: CandidateData) => {
        return a.unclaimedEras.length - b.unclaimedEras.length;
      }
    );

    // Cache the value to return from the server.
    this.validCache = validCandidates;

    return validCandidates;
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

      // const unclaimedEras = await this.chaindata.getUnclaimedEras(stash);
      const [currentEra, err2] = await this.chaindata.getActiveEraIndex();
      const threshold = currentEra - this.unclaimedEraThreshold * 2 - 1; // Validators cannot have unclaimed rewards before this era
      // If unclaimed eras contain an era below the recent threshold
      if (!unclaimedEras.every((era) => era > threshold)) {
        const reason = `${stash} has unclaimed eras: ${unclaimedEras} prior to: ${
          threshold + 1
        } (era: ${currentEra})`;
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
