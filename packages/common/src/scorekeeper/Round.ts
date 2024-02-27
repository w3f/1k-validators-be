/**
 * Functions for rounds starting and ending for Scorekeeper
 *
 * @function Round
 */

import { scorekeeperLabel } from "./scorekeeper";
import { ChainData, logger, Models, queries, Types, Util } from "../index";
import { dockPoints } from "./Rank";
import { doNominations } from "./Nominating";
import { OTV } from "../constraints/constraints";
import { ConfigSchema } from "../config";
import MatrixBot from "../matrix";
import ApiHandler from "../ApiHandler/ApiHandler";
import Nominator from "../nominator/nominator";

/**
 * Handles the ending of a Nomination round.
 */
export const endRound = async (
  ending: boolean,
  nominatorGroups: Nominator[],
  chaindata: ChainData,
  constraints: OTV,

  config: ConfigSchema,
  bot?: MatrixBot,
): Promise<void> => {
  ending = true;
  logger.info("Ending round", scorekeeperLabel);

  // The targets that have already been processed for this round.
  const toProcess: Map<Types.Stash, Models.Candidate> = new Map();

  const { lastNominatedEraIndex: startEra } =
    await queries.getLastNominatedEraIndex();

  const [activeEra, err] = await chaindata.getActiveEraIndex();
  if (err) {
    throw new Error(`Error getting active era: ${err}`);
  }

  const chainType = await queries.getChainMetadata();
  if (!chainType) {
    throw new Error(`Error getting chain metadata`);
  }

  logger.info(
    `finding validators that were active from era ${startEra} to ${activeEra}`,
    scorekeeperLabel,
  );
  const [activeValidators, err2] = await chaindata.activeValidatorsInPeriod(
    Number(startEra),
    activeEra,
    chainType?.name,
  );
  if (!activeValidators || err2) {
    throw new Error(`Error getting active validators: ${err2}`);
  }

  // Get all the candidates we want to process this round
  // This includes both the candidates we have nominated as well as all valid candidates

  // Gets adds candidates we nominated to the list
  for (const nominator of nominatorGroups) {
    const current = await queries.getCurrentTargets(nominator.bondedAddress);

    // If not nominating any... then return.
    if (!current.length) {
      logger.info(
        `${nominator.bondedAddress} is not nominating any targets.`,
        scorekeeperLabel,
      );
      continue;
    }

    for (const val of current) {
      if (val?.stash) {
        const candidate = await queries.getCandidate(val?.stash);
        if (!candidate) {
          logger.warn(
            `Ending round - cannot find candidate for ${val} stash: ${val.stash}`,
            scorekeeperLabel,
          );
          continue;
        }
        // if we already have, don't add it again
        if (toProcess.has(candidate.stash)) continue;
        toProcess.set(candidate.stash, candidate);
      }
    }
  }

  // Adds all other valid candidates to the list
  const allCandidates = await queries.allCandidates();

  const validCandidates = allCandidates.filter((candidate) => candidate.valid);

  for (const candidate of validCandidates) {
    if (toProcess.has(candidate.stash)) continue;
    toProcess.set(candidate.stash, candidate);
  }

  // Get the set of Good Validators and get the set of Bad validators
  const [good, bad] = await constraints.processCandidates(
    new Set(toProcess.values()),
  );

  logger.info(
    `Done processing Candidates. ${good.size} good ${bad.size} bad`,
    scorekeeperLabel,
  );

  // For all the good validators, check if they were active in the set for the time period
  //     - If they were active, increase their rank
  for (const goodOne of good.values()) {
    const { stash } = goodOne;
    const wasActive =
      activeValidators.indexOf(Util.formatAddress(stash, config)) !== -1;

    // if it wasn't active we will not increase the point
    if (!wasActive) {
      logger.info(
        `${stash} was not active during eras ${startEra} to ${activeEra}`,
        scorekeeperLabel,
      );
      continue;
    }

    // They were active - increase their rank and add a rank event
    const didRank = await queries.pushRankEvent(stash, startEra, activeEra);
  }

  // For all bad validators, dock their points and create a "Fault Event"
  for (const badOne of bad.values()) {
    const { candidate, reason } = badOne;
    const { stash } = candidate;
    const didFault = await queries.pushFaultEvent(stash, reason);
    if (didFault) await dockPoints(stash, bot);
  }

  ending = false;
};

/// Handles the beginning of a new round.
// - Gets the current era
// - Gets all valid candidates
// - Nominates valid candidates
// - Sets this current era to the era a nomination round took place in.
export const startRound = async (
  nominating: boolean,
  currentEra: number,
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
    `New round starting at ${now} for next Era ${currentEra + 1}`,
    scorekeeperLabel,
  );
  bot?.sendMessage(
    `New round is starting! Era ${newEra} will begin new nominations.`,
  );

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

  // Set Validity
  for (const [index, candidate] of allCandidates.entries()) {
    logger.info(
      `checking candidate ${candidate.name} [${index}/${allCandidates.length}]`,
      scorekeeperLabel,
    );
    await constraints.checkCandidate(candidate);
  }

  // Score all candidates
  await constraints.scoreAllCandidates();

  await Util.sleep(6000);

  const validCandidates = allCandidates.filter((candidate) => candidate.valid);
  const scoredValidCandidates = await Promise.all(
    validCandidates.map(async (candidate) => {
      const score = await queries.getLatestValidatorScore(candidate.stash);
      const scoredCandidate = {
        name: candidate.name,
        stash: candidate.stash,
        total: score.total,
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
  } else {
    logger.info(
      `${numValidatorsNominated} nominated this round, lastNominatedEra not set...`,
      scorekeeperLabel,
    );
  }
  nominating = false;

  return currentTargets;
};
