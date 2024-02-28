import { JobsRunner, startMonolithJobs } from "./JobRunner";
import { Job } from "./JobsClass";

export class MonolithJobRunner extends JobsRunner {
  _startSpecificJobs = async (): Promise<Job[]> => {
    return await startMonolithJobs(this.metadata);
  };
}
