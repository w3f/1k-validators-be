import { logger } from "../..//index";

import { scorekeeperLabel } from "../scorekeeper";
import { Jobs } from "./JobsClass";
import {
  startActiveValidatorJob,
  startBlockDataJob,
  startClearAccumulatedOfflineTimeJob,
  startEraPointsJob,
  startEraStatsJob,
  startInclusionJob,
  startLocationStatsJob,
  startMonitorJob,
  startNominatorJob,
  startScoreJob,
  startSessionKeyJob,
  startValidatorPrefJob,
  startValidityJob,
} from "./cron/StartCronJobs";

export class JobsMonolith extends Jobs {
  _startSpecificJobs = async (): Promise<void> => {
    const { config, constraints, chaindata, jobStatusEmitter } = this.metadata;
    try {
      await startMonitorJob(this.metadata);
      await startValidityJob(this.metadata);
      await startScoreJob(this.metadata);
      await startEraPointsJob(this.metadata);
      await startActiveValidatorJob(this.metadata);
      await startInclusionJob(this.metadata);
      await startSessionKeyJob(this.metadata);
      await startValidatorPrefJob(this.metadata);
      await startEraStatsJob(this.metadata);
      await startLocationStatsJob(this.metadata);
      await startNominatorJob(this.metadata);
      await startBlockDataJob(this.metadata);
      await startClearAccumulatedOfflineTimeJob(this.metadata);
    } catch (e) {
      logger.error(e.toString(), scorekeeperLabel);
      logger.error("Error starting monolith jobs", scorekeeperLabel);
    }
  };
}
