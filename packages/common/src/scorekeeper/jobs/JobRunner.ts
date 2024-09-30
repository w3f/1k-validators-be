import { logger } from "../../index";
import { scorekeeperLabel } from "../scorekeeper";
import { Job, JobRunnerMetadata, jobsLabel } from "./JobsClass";
import { JobFactory } from "./JobFactory";
import { getJobConfigs } from "./JobConfigs";

export abstract class JobsRunner {
  constructor(protected readonly metadata: JobRunnerMetadata) {}

  abstract _startSpecificJobs(): Promise<Job[]>;

  public startJobs = async (): Promise<Job[]> => {
    try {
      return await this._startSpecificJobs();
    } catch (e) {
      logger.warn(`There was an error running some cron jobs...`, jobsLabel);
      logger.error(e);
      return [];
    }
  };
}

export const startMonolithJobs = async (
  metadata: JobRunnerMetadata,
): Promise<Job[]> => {
  try {
    const jobs = await JobFactory.makeJobs(getJobConfigs(metadata), metadata);
    for (const job of jobs) {
      await job.setupAndStartJob();
    }
    return jobs;
  } catch (e) {
    logger.error(e, {
      message: "Error starting monolith jobs",
      ...scorekeeperLabel,
    });

    return [];
  }
};
