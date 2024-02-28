import { MicroserviceJobRunner } from "./MicroserviceJobRunner";
import { MonolithJobRunner } from "./MonolithJobRunner";
import { JobsRunner } from "./JobRunner";
import { JobRunnerMetadata } from "./JobsClass";

export class JobsRunnerFactory {
  static makeJobs = async (
    metadata: JobRunnerMetadata,
  ): Promise<JobsRunner> => {
    if (!metadata.config?.redis?.host && metadata.config?.redis?.port)
      return new MicroserviceJobRunner(metadata);
    else return new MonolithJobRunner(metadata);
  };
}
