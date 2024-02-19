import { logger } from "@1kv/common";

import { scorekeeperLabel } from "../../scorekeeper";
import { Jobs } from "./Jobs";
import {
  startActiveValidatorJob,
  startBlockDataJob,
  startEraPointsJob,
  startEraStatsJob,
  startInclusionJob,
  startLocationStatsJob,
  startNominatorJob,
  startScoreJob,
  startSessionKeyJob,
  startValidatityJob,
  startValidatorPrefJob,
} from "../cron/cron";
import { monitorJob } from "../cron/jobs";

export class JobsMonolith extends Jobs {
  _startSpecificJobs = async (): Promise<void> => {
    const { config, constraints, chainData } = this.metadata;
    try {
      await monitorJob();
      await startValidatityJob(config, constraints);
      await startScoreJob(config, constraints);
      await startEraPointsJob(config, chainData);
      await startActiveValidatorJob(config, chainData);
      await startInclusionJob(config, chainData);
      await startSessionKeyJob(config, chainData);
      await startValidatorPrefJob(config, chainData);
      await startEraStatsJob(config, chainData);
      await startLocationStatsJob(config, chainData);
      await startNominatorJob(config, chainData);
      await startBlockDataJob(config, chainData);
    } catch (e) {
      logger.error(e.toString(), scorekeeperLabel);
      logger.error("Error starting monolith jobs", scorekeeperLabel);
    }
  };
}
