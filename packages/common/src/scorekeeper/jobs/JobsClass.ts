import {
  ApiHandler,
  ChainData,
  Config,
  Constraints,
  logger,
} from "../../index";

import { scorekeeperLabel, SpawnedNominatorGroup } from "../scorekeeper";
import {
  startActiveValidatorJob,
  startBlockDataJob,
  startCancelJob,
  startClearAccumulatedOfflineTimeJob,
  startEraPointsJob,
  startEraStatsJob,
  startExecutionJob,
  startInclusionJob,
  startLocationStatsJob,
  startMainScorekeeperJob,
  startMonitorJob,
  startNominatorJob,
  startScoreJob,
  startSessionKeyJob,
  startStaleNominationJob,
  startUnclaimedEraJob,
  startValidatorPrefJob,
  startValidityJob,
} from "./cron/StartCronJobs";

export type jobsMetadata = {
  config: Config.ConfigSchema;
  ending: boolean;
  chaindata: ChainData;
  nominatorGroups: Array<SpawnedNominatorGroup>;
  nominating: boolean;
  currentEra: number;
  bot: any;
  constraints: Constraints.OTV;
  handler: ApiHandler;
  currentTargets: string[];
};

export interface JobStatus {
  runCount: number;
  updated: number;
  status: "started" | "running" | "finished" | "errored";
  error?: string;
  progress?: number; // Progress from 0 to 100
  iteration?: string; // Name of the current iteration
}

export abstract class Jobs {
  constructor(protected readonly metadata: jobsMetadata) {}

  abstract _startSpecificJobs(): Promise<void>;

  public startJobs = async (): Promise<void> => {
    try {
      await this._startSpecificJobs();
    } catch (e) {
      logger.warn(
        `There was an error running some cron jobs...`,
        scorekeeperLabel,
      );
      logger.error(e);
    }
  };
}

// Jobs specific to scorekeeper, that usually have accounts and transactions that need to be made
const startScorekeeperJobs = async (metadata: jobsMetadata): Promise<any> => {
  await startExecutionJob(metadata);
  await startUnclaimedEraJob(metadata);
  await startCancelJob(metadata);
  await startStaleNominationJob(metadata);
  await startMainScorekeeperJob(metadata);
};

export const startMonolithJobs = async (
  metadata: jobsMetadata,
): Promise<boolean> => {
  try {
    await startMonitorJob(metadata);
    await startValidityJob(metadata);
    await startScoreJob(metadata);
    await startEraPointsJob(metadata);
    await startActiveValidatorJob(metadata);
    await startInclusionJob(metadata);
    await startSessionKeyJob(metadata);
    await startValidatorPrefJob(metadata);
    await startEraStatsJob(metadata);
    await startLocationStatsJob(metadata);
    await startNominatorJob(metadata);
    await startBlockDataJob(metadata);
    await startClearAccumulatedOfflineTimeJob(metadata);

    await startScorekeeperJobs(metadata);
    return true;
  } catch (e) {
    logger.error(e.toString(), scorekeeperLabel);
    logger.error("Error starting monolith jobs", scorekeeperLabel);
    return false;
  }
};
