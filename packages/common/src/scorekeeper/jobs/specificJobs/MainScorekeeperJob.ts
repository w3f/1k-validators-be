import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import logger from "../../../logger";
import { scorekeeperLabel } from "../../scorekeeper";
import { queries } from "../../../index";
import { endRound, startRound } from "../../Round";
import { jobStatusEmitter } from "../../../Events";
import { JobNames } from "../JobConfigs";

export class MainScorekeeperJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const mainScorekeeperJob = async (
  metadata: JobRunnerMetadata,
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
  } = metadata;

  if (ending) {
    logger.info(`ROUND IS CURRENTLY ENDING.`, scorekeeperLabel);
    return;
  }

  const [activeEra, err] = await chaindata.getActiveEraIndex();
  if (err) {
    logger.warn(`CRITICAL: ${err}`, scorekeeperLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.MainScorekeeper,
      updated: Date.now(),
      error: JSON.stringify(err),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
    return;
  }

  const { lastNominatedEraIndex } = await queries.getLastNominatedEraIndex();
  const eraBuffer = config.global.networkPrefix == 0 ? 1 : 4;
  const isNominationRound =
    Number(lastNominatedEraIndex) <= activeEra - eraBuffer;

  if (isNominationRound) {
    let processedNominatorGroups = 0;
    const totalNominatorGroups = nominatorGroups ? nominatorGroups.length : 0;

    // Process each nominator group

    if (!config.scorekeeper.nominating) {
      logger.info(
        "Nominating is disabled in the settings. Skipping round.",
        scorekeeperLabel,
      );
      const errorStatus: JobStatus = {
        status: "errored",
        name: JobNames.MainScorekeeper,
        updated: Date.now(),
        error: "Nominating Disabled",
      };

      jobStatusEmitter.emit("jobErrored", errorStatus);
      return;
    }

    const allCurrentTargets: {
      name?: string;
      stash?: string;
      identity?: any;
    }[] = [];
    for (const nominator of nominatorGroups) {
      const currentTargets = await queries.getCurrentTargets(
        nominator.bondedAddress,
      );
      allCurrentTargets.push(...currentTargets); // Flatten the array
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
        nominatorGroups,
        chaindata,
        handler,
        config,
        allCurrentTargets,
      );
    } else {
      logger.info(`Ending round.`, scorekeeperLabel);
      await endRound(
        ending,
        nominatorGroups,
        chaindata,
        constraints,

        config,
        bot,
      );
      await startRound(
        nominating,
        currentEra,
        bot,
        constraints,
        nominatorGroups,
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
      name: JobNames.MainScorekeeper,
      progress,
      updated: Date.now(),
      iteration: `Processed nominator group ${processedNominatorGroups}`,
    });
  }
};
