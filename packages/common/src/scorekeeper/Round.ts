/**
 * Functions for rounds starting and ending for Scorekeeper
 *
 * @function Round
 */

import { scorekeeperLabel } from "./scorekeeper";
import { ChainData, logger, queries } from "../index";
import { doNominations } from "./Nominating";
import { OTV } from "../constraints/constraints";
import { ConfigSchema } from "../config";
import MatrixBot from "../matrix";
import ApiHandler from "../ApiHandler/ApiHandler";
import Nominator from "../nominator/nominator";
import { jobStatusEmitter } from "../Events";
import { JobEvent, JobKey } from "./jobs/types";
import { NominatorState, NominatorStatus } from "../types";

/// Handles the beginning of a new round.
// - Gets the current era
// - Gets all valid candidates
// - Nominates valid candidates
// - Sets this current era to the era a nomination round took place in.
export const startRound = async (
  nominating: boolean,
  bot: MatrixBot,
  constraints: OTV,
  nominatorGroups: Nominator[],
  chaindata: ChainData,
  handler: ApiHandler,
  config: ConfigSchema,
  currentTargets: { stash?: string; identity?: any }[],
): Promise<{ stash?: string; identity?: any }[] | null> => {
  // If this is already in the process of nominating, skip
  if (nominating) return [];
  nominating = true;

  const now = new Date().getTime();

  // The nominations sent now won't be active until the next era.
  const newEra = await chaindata.getCurrentEra();
  if (!newEra) return [];

  logger.info(
    `New round starting at ${now} for next Era ${newEra + 1}`,
    scorekeeperLabel,
  );
  await bot?.sendMessage(
    `New round is starting! Era ${newEra} will begin new nominations.`,
  );

  for (const nom of nominatorGroups) {
    const shouldNominate = await nom.shouldNominate();
    if (shouldNominate) {
      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominating,
        status: `Round Started`,
        updated: Date.now(),
        stale: false,
      };

      await nom.updateNominatorStatus(nominatorStatus);
    }
  }

  const proxyTxs = await queries.getAllDelayedTxs();

  // If the round was started and there are any pending proxy txs skip the round
  const NUM_NOMINATORS = 20;
  if (proxyTxs.length >= NUM_NOMINATORS) {
    const infoMsg = `round was started with ${proxyTxs.length} pending proxy txs. Skipping Round.`;
    logger.warn(infoMsg, scorekeeperLabel);
    bot?.sendMessage(infoMsg);
    return [];
  }

  // Get all Candidates and set validity
  const allCandidates = await queries.allCandidates();
  const validators = await chaindata.getValidators();

  // Set Validity
  for (const [index, candidate] of allCandidates.entries()) {
    const isValid = await constraints.checkCandidate(candidate, validators);

    const progress = Math.floor((index / allCandidates.length) * 100);
    jobStatusEmitter.emit(JobEvent.Progress, {
      name: JobKey.MainScorekeeper,
      progress,
      iteration: `${isValid ? "✅ " : "❌ "} ${candidate.name}`,
    });

    logger.info(
      `[${index}/${allCandidates.length}] checked ${candidate.name} ${isValid ? "Valid" : "Invalid"} [${index}/${allCandidates.length}]`,
      scorekeeperLabel,
    );
    for (const nom of nominatorGroups) {
      const shouldNominate = await nom.shouldNominate();
      if (!shouldNominate) {
        const nominatorStatus: NominatorStatus = {
          state: NominatorState.Nominating,
          status: `[${index}/${allCandidates.length}] ${candidate.name} ${isValid ? "✅ " : "❌"}`,
          updated: Date.now(),
          stale: false,
        };
        await nom.updateNominatorStatus(nominatorStatus);
      }
    }
  }

  for (const nom of nominatorGroups) {
    const shouldNominate = await nom.shouldNominate();
    if (shouldNominate) {
      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominating,
        status: `Scoring Candidates...`,
        updated: Date.now(),
        stale: false,
      };
      await nom.updateNominatorStatus(nominatorStatus);
    }
  }

  // Score all candidates
  await constraints.scoreAllCandidates();

  const validCandidates = allCandidates.filter((candidate) => candidate.valid);
  const scoredValidCandidates = await Promise.all(
    validCandidates.map(async (candidate) => {
      const score = await queries.getLatestValidatorScore(candidate.stash);
      const scoredCandidate = {
        name: candidate.name,
        stash: candidate.stash,
        total: score?.total || 0,
      };
      return scoredCandidate;
    }),
  );
  const sortedCandidates = scoredValidCandidates.sort((a, b) => {
    return b.total - a.total;
  });

  logger.info(
    `number of all candidates: ${allCandidates.length} valid candidates: ${sortedCandidates.length}`,
    scorekeeperLabel,
  );

  // TODO unit test that assets this  value
  const numValidatorsNominated = await doNominations(
    sortedCandidates,
    nominatorGroups,
    chaindata,
    handler,
    bot,
    config,
    currentTargets,
  );

  if (numValidatorsNominated && numValidatorsNominated > 0) {
    logger.info(
      `${numValidatorsNominated} nominated this round, setting last nominated era to ${newEra}`,
      scorekeeperLabel,
    );
    await queries.setLastNominatedEraIndex(newEra);
    for (const nom of nominatorGroups) {
      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominated,
        status: `Nominated!`,
        updated: Date.now(),
        stale: false,
        lastNominationEra: newEra,
      };
      await nom.updateNominatorStatus(nominatorStatus);
    }
  } else {
    logger.info(
      `${numValidatorsNominated} nominated this round, lastNominatedEra not set...`,
      scorekeeperLabel,
    );
  }
  nominating = false;

  return currentTargets;
};
