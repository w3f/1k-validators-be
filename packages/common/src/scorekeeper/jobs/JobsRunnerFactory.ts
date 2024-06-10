import { MonolithJobRunner } from "./MonolithJobRunner";
import { JobsRunner } from "./JobRunner";
import { JobRunnerMetadata } from "./JobsClass";

export class JobsRunnerFactory {
  static makeJobs = async (
    metadata: JobRunnerMetadata,
  ): Promise<JobsRunner> => {
    return new MonolithJobRunner(metadata);
  };
}
