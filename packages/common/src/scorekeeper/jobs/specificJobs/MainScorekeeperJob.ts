import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import logger from "../../../logger";
import { queries } from "../../../index";
import { startRound } from "../../Round";
import { jobStatusEmitter } from "../../../Events";
import { JobNames } from "../JobConfigs";
import { NOMINATOR_SHOULD_NOMINATE_ERAS_THRESHOLD } from "../../../constants";

export class MainScorekeeperJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

const mainScoreKeeperLabel = { label: "MainScorekeeperJob" };

export const mainScorekeeperJob = async (
  metadata: JobRunnerMetadata,
): Promise<void> => {
  const {
    constraints,
    config,
    chaindata,
    nominatorGroups,
    nominating,
    bot,
    handler,
  } = metadata;
  logger.info(`Running Main Scorekeeper`, mainScoreKeeperLabel);

  const [activeEra, err] = await chaindata.getActiveEraIndex();
  if (err) {
    logger.warn(`CRITICAL: ${err}`, mainScoreKeeperLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.MainScorekeeper,
      updated: Date.now(),
      error: JSON.stringify(err),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
    return;
  }

  const lastNominatedEra = await queries.getLastNominatedEraIndex();
  const lastNominatedEraIndex = lastNominatedEra?.lastNominatedEraIndex || 0;
  const eraBuffer = config.global.networkPrefix == 0 ? 1 : 4;
  const isNominationRound =
    Number(lastNominatedEraIndex) <= activeEra - eraBuffer;

  logger.info(
    `last era: ${lastNominatedEraIndex} is nomination round: ${isNominationRound}`,
    mainScoreKeeperLabel,
  );
  const hasOld = await Promise.all(
    nominatorGroups.filter(async (nom) => {
      const stash = await nom.stash();
      if (!stash || stash === "0x") return false;
      const lastNominatedEra =
        (await chaindata.getNominatorLastNominationEra(stash)) || 0;
      return (
        activeEra - lastNominatedEra >= NOMINATOR_SHOULD_NOMINATE_ERAS_THRESHOLD
      );
    }),
  );

  if (isNominationRound || hasOld) {
    logger.info(
      `${activeEra} is nomination round, starting....`,
      mainScoreKeeperLabel,
    );
    let processedNominatorGroups = 0;
    const totalNominatorGroups = nominatorGroups ? nominatorGroups.length : 0;

    // Process each nominator group

    if (!config.scorekeeper.nominating && !config?.scorekeeper?.dryRun) {
      logger.info(
        "Nominating is disabled in the settings and Dry Run is false. Skipping round.",
        mainScoreKeeperLabel,
      );
      const errorStatus: JobStatus = {
        status: "errored",
        name: JobNames.MainScorekeeper,
        updated: Date.now(),
        error: "Nominating Disabled",
      };

      jobStatusEmitter.emit("jobErrored", errorStatus);
      return;
    } else {
      logger.info(
        `${config?.scorekeeper?.dryRun ? "DRY RUN: " : ""}Starting round.`,
        mainScoreKeeperLabel,
      );
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

    logger.info(
      `Starting round -  ${allCurrentTargets.length} current targets`,
      mainScoreKeeperLabel,
    );

    await startRound(
      nominating,
      bot,
      constraints,
      hasOld,
      chaindata,
      handler,
      config,
      allCurrentTargets,
    );

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
