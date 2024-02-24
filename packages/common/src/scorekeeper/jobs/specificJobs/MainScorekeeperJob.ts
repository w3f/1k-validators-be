import { jobsMetadata } from "../JobsClass";
import logger from "../../../logger";
import { scorekeeperLabel } from "../../scorekeeper";
import { queries } from "../../../index";
import { endRound, startRound } from "../../Round";

export const mainScorekeeperJob = async (
  metadata: jobsMetadata,
): Promise<void> => {
  const {
    constraints,
    ending,
    config,
    chaindata,
    nominatorGroups,
    nominating,
    currentEra,
    bot,
    handler,
    jobStatusEmitter,
  } = metadata;

  if (ending) {
    logger.info(`ROUND IS CURRENTLY ENDING.`, scorekeeperLabel);
    return;
  }

  const [activeEra, err] = await chaindata.getActiveEraIndex();
  if (err) {
    logger.warn(`CRITICAL: ${err}`, scorekeeperLabel);
    return;
  }

  const { lastNominatedEraIndex } = await queries.getLastNominatedEraIndex();
  const eraBuffer = config.global.networkPrefix == 0 ? 1 : 4;
  const isNominationRound =
    Number(lastNominatedEraIndex) <= activeEra - eraBuffer;

  if (isNominationRound) {
    let processedNominatorGroups = 0;
    const totalNominatorGroups = nominatorGroups ? nominatorGroups.length : 0;

    for (const nomGroup of nominatorGroups) {
      if (!nomGroup) continue;

      // Process each nominator group

      if (!config.scorekeeper.nominating) {
        logger.info(
          "Nominating is disabled in the settings. Skipping round.",
          scorekeeperLabel,
        );
        return;
      }

      const allCurrentTargets = [];
      for (const nominator of nomGroup) {
        const currentTargets = await queries.getCurrentTargets(
          nominator.bondedAddress,
        );
        allCurrentTargets.push(currentTargets);
      }

      if (!allCurrentTargets.length) {
        logger.info(
          "Current Targets is empty. Starting round.",
          scorekeeperLabel,
        );
        await startRound(
          nominating,
          currentEra,
          bot,
          constraints,
          nomGroup, // Pass the current nominator group
          chaindata,
          handler,
          config,
          allCurrentTargets,
        );
      } else {
        logger.info(`Ending round.`, scorekeeperLabel);
        await endRound(
          ending,
          [nomGroup], // Pass an array containing the current nominator group
          chaindata,
          constraints,
          bot,
          config,
        );
        await startRound(
          nominating,
          currentEra,
          bot,
          constraints,
          nomGroup, // Pass the current nominator group
          chaindata,
          handler,
          config,
          allCurrentTargets,
        );
      }

      processedNominatorGroups++;

      // Calculate progress percentage
      const progress = Math.floor(
        (processedNominatorGroups / totalNominatorGroups) * 100,
      );

      // Emit progress update event with custom iteration name
      jobStatusEmitter.emit("jobProgress", {
        name: "Main Scorekeeper Job",
        progress,
        updated: Date.now(),
        iteration: `Processed nominator group ${processedNominatorGroups}`,
      });
    }
  }
};
