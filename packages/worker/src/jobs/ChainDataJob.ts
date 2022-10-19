import { ChainData, Db, logger } from "@1kv/common";
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

export const processChainDataJob = async (
  job: any,
  db: Db,
  chaindata: ChainData
) => {
  const { jobType } = job.data;
  logger.info(`Processing type: ${jobType}`);
  switch (jobType) {
    case ACTIVE_VALIDATOR_JOB:
      await processActiveValidatorJob(job, db, chaindata);
      break;
    case COUNCIL_JOB:
      await processCouncilJob(job, db, chaindata);
      break;
    case DELEGATION_JOB:
      await processDelegationJob(job, db, chaindata);
      break;
    case DEMOCRACY_JOB:
      await processDemocracyJob(job, db, chaindata);
      break;
    case ERA_POINTS_JOB:
      await processEraPointsJob(job, db, chaindata);
      break;
    case ERA_STATS_JOB:
      await processEraStatsJob(job, db, chaindata);
      break;
    case INCLUSION_JOB:
      await processInclusionJob(job, db, chaindata);
      break;
    case NOMINATOR_JOB:
      await processNominatorJob(job, db, chaindata);
      break;
    case SESSION_KEY_JOB:
      await processSessionKeyJob(job, db, chaindata);
      break;
    case VALIDATOR_PREF_JOB:
      await processValidatorPrefJob(job, db, chaindata);
      break;
  }
};
