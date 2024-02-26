import { Jobs, startMonolithJobs } from "./JobsClass";

export class JobsMonolith extends Jobs {
  _startSpecificJobs = async (): Promise<void> => {
    await startMonolithJobs(this.metadata);
  };
}
