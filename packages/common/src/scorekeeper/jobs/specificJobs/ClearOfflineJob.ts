import { JobEvent, JobRunnerMetadata } from "../types";
import { jobStatusEmitter } from "../../../Events";
import { JobKey } from "../types";
import { queries } from "../../../index";

export const clearOfflineJob = async (
  jobRunnerMetadata?: JobRunnerMetadata,
) => {
  jobStatusEmitter.emit(JobEvent.Progress, {
    name: JobKey.ClearOffline,
    progress: 0,
  });
  await queries.clearAccumulated();
  jobStatusEmitter.emit(JobEvent.Progress, {
    name: JobKey.ClearOffline,
    progress: 100,
  });
};
