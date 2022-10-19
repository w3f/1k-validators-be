import { ApiHandler, Db, logger, Constraints } from "@1kv/common";
import { SCORE_JOB, VALIDITY_JOB } from "./index";

export const validityJob = async (constraints: Constraints.OTV) => {
  const start = Date.now();

  logger.info(
    `(job::Constraints:Validity::start) Running Constraints:Validity job`
  );

  await constraints.checkAllCandidates();

  const end = Date.now();

  logger.info(
    `{job::Constraints:Validity::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const scoreJob = async (constraints: Constraints.OTV) => {
  const start = Date.now();

  logger.info(`(job::Constraints:Score::start) Running Constraints:Score job`);

  await constraints.scoreAllCandidates();

  const end = Date.now();

  logger.info(
    `{job::Constraints:Score::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Called by worker to process Job
export const processConstraintsJob = async (job: any, otv: Constraints.OTV) => {
  const { jobType } = job.data;
  logger.info(`Processing type: ${jobType}`);
  switch (jobType) {
    case VALIDITY_JOB:
      await validityJob(otv);
      break;
    case SCORE_JOB:
      await scoreJob(otv);
      break;
  }
};
