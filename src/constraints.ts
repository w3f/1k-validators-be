import { WEEK, TEN_PERCENT, FIFTY_KSM } from "./constants";
import logger from "./logger";
import { CandidateData } from "./types";
import ChainData from "./chaindata";
import ApiHandler from "./ApiHandler";

export interface Constraints {
  getValidCandidates(candidates: any[]): Promise<any[]>;
  processCandidates(
    candidates: Set<CandidateData>
  ): Promise<[Set<any>, Set<any>]>;
}

export class OTV implements Constraints {
  private chaindata: ChainData;
  private skipConnectionTime: boolean;

  private validCache: CandidateData[] = [];
  private invalidCache: string[] = [];

  constructor(handler: ApiHandler, skipConnectionTime = false) {
    this.chaindata = new ChainData(handler);
    this.skipConnectionTime = skipConnectionTime;
  }

  get validCandidateCache(): CandidateData[] {
    return this.validCache;
  }

  get invalidCandidateCache(): string[] {
    return this.invalidCache;
  }

  /// Returns true if it's a valid candidate or [false, "reason"] otherwise.
  async getInvalidCandidates(
    candidates: CandidateData[]
  ): Promise<{ stash: string; reason: string }[]> {
    const invalid = await Promise.all(
      candidates.map(async (candidate) => {
        const { stash } = candidate;
        const [isValid, reason] = await this.checkSingleCandidate(candidate);
        if (!isValid) return { stash, reason };
      })
    );

    this.invalidCache = invalid.filter((i) => !!i).map((i) => i.reason);

    return invalid;
  }

  /// Returns true if it's a valid candidate or [false, "reason"] otherwise.
  async checkSingleCandidate(
    candidate: CandidateData
  ): Promise<[boolean, string]> {
    const {
      connectedAt,
      updated,
      name,
      offlineAccumulated,
      offlineSince,
      onlineSince,
      stash,
    } = candidate;

    // Ensure the candidate is online.
    if (onlineSince === 0 || offlineSince !== 0) {
      return [false, `${name} offline. Offline since ${offlineSince}.`];
    }

    // Only take nodes that have been upgraded to latest versions.
    if (!updated) {
      return [false, `${name} is not running the latest client code.`];
    }

    if (!this.skipConnectionTime) {
      const now = new Date().getTime();
      if (now - connectedAt < WEEK) {
        return [false, `${name} hasn't been connected for minimum length.`];
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

    const [commission, err] = await this.chaindata.getCommission(stash);
    if (err) {
      return [false, `${name} ${err}`];
    }
    if (commission > TEN_PERCENT) {
      return [
        false,
        `${name} commission is set higher than ten percent: ${commission}`,
      ];
    }

    const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
    if (err2) {
      return [false, `${name} ${err2}`];
    }

    if (bondedAmt < FIFTY_KSM) {
      return [
        false,
        `${name} has less then fifty KSM bonded: ${
          bondedAmt / 10 ** 12
        } KSM is bonded.`,
      ];
    }

    return [true, ""];
  }

  async getValidCandidates(
    candidates: CandidateData[]
  ): Promise<CandidateData[]> {
    let validCandidates = [];
    for (const candidate of candidates) {
      const [isValid, reason] = await this.checkSingleCandidate(candidate);

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
        return a.connectedAt - b.connectedAt;
      }
    );

    // Sort so the ones who nominated most recently are less prioritized.
    validCandidates = validCandidates.sort(
      (a: CandidateData, b: CandidateData) => {
        return a.nominatedAt - b.nominatedAt;
      }
    );

    // Cache the value to return from the server.
    this.validCache = validCandidates;

    return validCandidates;
  }

  /// At the end of a nomination round this is the logic that separates the
  /// candidates that did good from the ones that did badly.
  async processCandidates(
    candidates: Set<CandidateData>
  ): Promise<
    [Set<CandidateData>, Set<{ candidate: CandidateData; reason: string }>]
  > {
    const [activeEraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }

    const good: Set<CandidateData> = new Set();
    const bad: Set<{ candidate: CandidateData; reason: string }> = new Set();

    for (const candidate of candidates) {
      const { name, offlineSince, stash } = candidate;
      /// Ensure the commission wasn't raised/
      const [commission, err] = await this.chaindata.getCommission(stash);
      /// If it errors we assume that a validator removed their validator status.
      if (err) {
        const reason = `${name} ${err}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      if (commission > TEN_PERCENT) {
        const reason = `${name} found commission higher than ten percent: ${commission}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
      if (err2) {
        const reason = `${name} ${err2}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }
      if (bondedAmt < FIFTY_KSM) {
        const reason = `${name} has less then fifty KSM bonded: ${bondedAmt}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      // Ensure the candidate is online.
      if (offlineSince !== 0) {
        const reason = `${name} offline. Offline since ${offlineSince}.`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      const [hasSlashes, err3] = await this.chaindata.hasUnappliedSlashes(
        activeEraIndex - 2,
        activeEraIndex,
        stash
      );
      if (err3) {
        const reason = `${name} ${err3}`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }
      if (hasSlashes) {
        const reason = `${name} has slashes.`;
        logger.info(reason);
        bad.add({ candidate, reason });
        continue;
      }

      good.add(candidate);
    }

    return [good, bad];
  }
}
