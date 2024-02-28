import { processActiveValidatorJob } from "./ActiveValidatorJob";
import { processEraPointsJob } from "./EraPointsJob";
import { processEraStatsJob } from "./EraStatsJob";
import { processInclusionJob } from "./InclusionJob";
import { processNominatorJob } from "./NominatorJob";
import { processSessionKeyJob } from "./SessionKeyJob";
import { processValidatorPrefJob } from "./ValidatorPrefJob";
import {
  ACTIVE_VALIDATOR_JOB,
  ERA_POINTS_JOB,
  ERA_STATS_JOB,
  INCLUSION_JOB,
  NOMINATOR_JOB,
  SESSION_KEY_JOB,
  VALIDATOR_PREF_JOB,
} from "./index";
import { JobRunnerMetadata } from "../JobsClass";

export const chaindataLabel = { label: "Chaindata" };

export const processChainDataJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  const { jobType, candidateAddress } = job.data;
  // logger.info(`Processing type: ${jobType}`, chaindataLabel);
  switch (jobType) {
    case ACTIVE_VALIDATOR_JOB:
      await processActiveValidatorJob(job, metadata);
      break;
    case ERA_POINTS_JOB:
      await processEraPointsJob(job, metadata);
      break;
    case ERA_STATS_JOB:
      await processEraStatsJob(job, metadata);
      break;
    case INCLUSION_JOB:
      await processInclusionJob(job, metadata);
      break;
    case NOMINATOR_JOB:
      await processNominatorJob(job, metadata);
      break;
    case SESSION_KEY_JOB:
      await processSessionKeyJob(job, metadata);
      break;
    case VALIDATOR_PREF_JOB:
      await processValidatorPrefJob(job, metadata, candidateAddress);
      break;
  }
};
