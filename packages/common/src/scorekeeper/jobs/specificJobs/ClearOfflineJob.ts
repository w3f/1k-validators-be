import { Job, JobConfig, JobRunnerMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { JobNames } from "../JobConfigs";
import { queries } from "../../../index";

export class ClearOfflineJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const clearOfflineJob = async (jobRunnerMetadata?: JobRunnerMetadata) => {
  jobStatusEmitter.emit("jobProgress", {
    name: JobNames.ClearOffline,
    progress: 0,
    updated: Date.now(),
  });
  await queries.clearAccumulated();
  jobStatusEmitter.emit("jobProgress", {
    name: JobNames.ClearOffline,
    progress: 100,
    updated: Date.now(),
  });
};
