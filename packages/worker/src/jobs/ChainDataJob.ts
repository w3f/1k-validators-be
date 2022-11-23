import { ChainData, logger } from "@1kv/common";
import { processActiveValidatorJob } from "./ActiveValidatorJob";
import { processCouncilJob } from "./CouncilJob";
import { processDelegationJob } from "./DelegationJob";
import { processDemocracyJob } from "./DemocracyJob";
import { processEraPointsJob } from "./EraPointsJob";
import { processEraStatsJob } from "./EraStatsJob";
import { processInclusionJob } from "./InclusionJob";
import { processNominatorJob } from "./NominatorJob";
import { processSessionKeyJob } from "./SessionKeyJob";
import { processValidatorPrefJob } from "./ValidatorPrefJob";
import {
  ACTIVE_VALIDATOR_JOB,
  COUNCIL_JOB,
  DELEGATION_JOB,
  DEMOCRACY_JOB,
  ERA_POINTS_JOB,
  ERA_STATS_JOB,
  INCLUSION_JOB,
  NOMINATOR_JOB,
  SESSION_KEY_JOB,
  VALIDATOR_PREF_JOB,
} from "./index";

export const chaindataLabel = { label: "Chaindata" };

export const processChainDataJob = async (job: any, chaindata: ChainData) => {
  const { jobType, candidateAddress } = job.data;
  // logger.info(`Processing type: ${jobType}`, chaindataLabel);
  switch (jobType) {
    case ACTIVE_VALIDATOR_JOB:
      await processActiveValidatorJob(job, chaindata);
      break;
    case COUNCIL_JOB:
      await processCouncilJob(job, chaindata);
      break;
    case DELEGATION_JOB:
      await processDelegationJob(job, chaindata);
      break;
    case DEMOCRACY_JOB:
      await processDemocracyJob(job, chaindata);
      break;
    case ERA_POINTS_JOB:
      await processEraPointsJob(job, chaindata);
      break;
    case ERA_STATS_JOB:
      await processEraStatsJob(job, chaindata);
      break;
    case INCLUSION_JOB:
      await processInclusionJob(job, chaindata);
      break;
    case NOMINATOR_JOB:
      await processNominatorJob(job, chaindata);
      break;
    case SESSION_KEY_JOB:
      await processSessionKeyJob(job, chaindata);
      break;
    case VALIDATOR_PREF_JOB:
      await processValidatorPrefJob(job, chaindata, candidateAddress);
      break;
  }
};
