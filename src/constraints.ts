import { WEEK, TEN_PERCENT, FIFTY_KSM } from "./constants";
import logger from "./logger";
import { CandidateData } from "./types";
import { valid } from "semver";
import ChainData from "./chaindata";
import { ApiPromise } from "@polkadot/api";

export interface Constraints {
  getValidCandidates(candidates: any[]): Promise<any[]>;
  processCandidates(
    candidates: Set<CandidateData>
  ): Promise<[Set<any>, Set<any>]>;
}

export class OTV implements Constraints {
  private chaindata: ChainData;
  private skipConnectionTime: boolean;
  private skipSentry: boolean;

  constructor(api: ApiPromise, skipConnectionTime = false, skipSentry = false) {
    this.chaindata = new ChainData(api);
    this.skipConnectionTime = skipConnectionTime;
    this.skipSentry = skipSentry;
  }

  async getValidCandidates(
    candidates: CandidateData[]
  ): Promise<CandidateData[]> {
    let validCandidates = [];
    for (const candidate of candidates) {
      const {
        connectedAt,
        updated,
        name,
        offlineAccumulated,
        offlineSince,
        sentryOfflineSince,
        stash,
      } = candidate;

      // Ensure the candidate is online.
      if (offlineSince !== 0) {
        logger.info(`${name} offline. Offline since ${offlineSince}.`);
        continue;
      }

      // Ensure the sentry is online.
      if (sentryOfflineSince !== 0 && !this.skipSentry) {
        logger.info(
          `${name} sentry is offline. Offline since ${sentryOfflineSince}.`
        );
        continue;
      }

      // Only take nodes that have been upgraded to latest versions.
      if (!updated) {
        logger.info(`${name} is not running the latest client code.`);
        continue;
      }

      if (!this.skipConnectionTime) {
        const now = new Date().getTime();
        if (now - connectedAt < WEEK) {
          logger.info(`${name} hasn't been connected for minimum length.`);
          continue;
        }
      }

      // Ensures node has 98% up time.
      const totalOffline = offlineAccumulated / WEEK;
      if (totalOffline > 0.02) {
        logger.info(
          `${name} has been offline ${
            offlineAccumulated / 1000 / 60
          } minutes this week.`
        );
      }

      const [commission, err] = await this.chaindata.getCommission(stash);
      if (err) {
        logger.info(`${name} ${err}`);
        continue;
      }
      if (commission > TEN_PERCENT) {
        logger.info(
          `${name} commission is set higher than ten percent: ${commission}`
        );
        continue;
      }

      const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
      if (err2) {
        logger.info(`${name} ${err2}`);
        continue;
      }
      if (bondedAmt < FIFTY_KSM) {
        logger.info(
          `${name} has less then fifty KSM bonded: ${
            bondedAmt / 10 ** 12
          } KSM is bonded.`
        );
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

    return validCandidates;
  }

  /// At the end of a nomination round this is the logic that separates the
  /// candidates that did good from the ones that did badly.
  async processCandidates(
    candidates: Set<CandidateData>
  ): Promise<[Set<CandidateData>, Set<CandidateData>]> {
    const [activeEraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }

    const good: Set<CandidateData> = new Set();
    const bad: Set<CandidateData> = new Set();

    for (const candidate of candidates) {
      const { name, offlineSince, stash } = candidate;
      /// Ensure the commission wasn't raised/
      const [commission, err] = await this.chaindata.getCommission(stash);
      /// If it errors we assume that a validator removed their validator status.
      if (err) {
        logger.info(`${name} ${err}`);
        bad.add(candidate);
        continue;
      }

      if (commission > TEN_PERCENT) {
        logger.info(
          `${name} found commission higher than ten percent: ${commission}`
        );
        bad.add(candidate);
        continue;
      }

      const [bondedAmt, err2] = await this.chaindata.getBondedAmount(stash);
      if (err2) {
        logger.info(`${name} ${err2}`);
        continue;
      }
      if (bondedAmt < FIFTY_KSM) {
        logger.info(`${name} has less then fifty KSM bonded: ${bondedAmt}`);
        continue;
      }

      // Ensure the candidate is online.
      if (offlineSince !== 0) {
        logger.info(`${name} offline. Offline since ${offlineSince}.`);
        bad.add(candidate);
        continue;
      }

      const [hasSlashes, err3] = await this.chaindata.hasUnappliedSlashes(
        activeEraIndex - 2,
        activeEraIndex,
        stash
      );
      if (err3) {
        logger.info(`${name} ${err3}`);
        bad.add(candidate);
        continue;
      }
      if (hasSlashes) {
        logger.info(`${name} has slashes.`);
        bad.add(candidate);
        continue;
      }

      good.add(candidate);
    }

    return [good, bad];
  }
}
