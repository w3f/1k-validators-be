import { JobsMicroservice } from "./JobsMicroservice";
import { JobsMonolith } from "./JobsMonolith";
import { jobsMetadata, Jobs } from "./Jobs";

export class JobsFactory {
  static makeJobs = async (metadata: jobsMetadata): Promise<Jobs> => {

    if(!metadata.config?.redis?.host && metadata.config?.redis?.port)
      return new JobsMicroservice(metadata)

    else
      return new JobsMonolith(metadata)
  }
}