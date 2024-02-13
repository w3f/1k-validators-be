/**
 * Functions for staring Monolith jobs
 *
 * @function MonolithJobs
 */

import { monitorJob } from "../../jobs";
import {
  startActiveValidatorJob,
  startBlockDataJob,
  startDelegationJob,
  startDemocracyJob,
  startEraPointsJob,
  startEraStatsJob,
  startInclusionJob,
  startLocationStatsJob,
  startNominatorJob,
  startScoreJob,
  startSessionKeyJob,
  startValidatityJob,
  startValidatorPrefJob,
} from "../../cron";
import { logger } from "@1kv/common";
import { scorekeeperLabel } from "../../scorekeeper";

export const startMonolithJobs = async (
  config,
  chaindata,
  constraints,
): Promise<any> => {
  try {
    await monitorJob();
    await startValidatityJob(config, constraints);
    await startScoreJob(config, constraints);
    await startEraPointsJob(config, chaindata);
    await startActiveValidatorJob(config, chaindata);
    await startInclusionJob(config, chaindata);
    await startSessionKeyJob(config, chaindata);
    await startValidatorPrefJob(config, chaindata);
    await startEraStatsJob(config, chaindata);
    await startLocationStatsJob(config, chaindata);
    await startDemocracyJob(config, chaindata);
    await startNominatorJob(config, chaindata);
    await startDelegationJob(config, chaindata);
    await startBlockDataJob(config, chaindata);
  } catch (e) {
    logger.error(e.toString(), scorekeeperLabel);
    logger.error("Error starting monolith jobs", scorekeeperLabel);
  }
};
