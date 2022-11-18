import { logger, Constraints } from "@1kv/common";
import { SCORE_JOB, VALIDITY_JOB } from "./index";

export const constraintsLabel = { label: "ConstraintsJob" };

export const validityJob = async (constraints: Constraints.OTV) => {
  const start = Date.now();

  logger.info(`Running Constraints:Validity job`, constraintsLabel);

  await constraints.checkAllCandidates();

  const end = Date.now();

  logger.info(
    `Validity Done. Took ${(end - start) / 1000} seconds`,
    constraintsLabel
  );
};

export const scoreJob = async (constraints: Constraints.OTV) => {
  const start = Date.now();

  logger.info(`Running Constraints:Score job`, constraintsLabel);

  await constraints.scoreAllCandidates();

  const end = Date.now();

  logger.info(
    `Score Done. Took ${(end - start) / 1000} seconds`,
    constraintsLabel
  );
};

// Called by worker to process Job
export const processConstraintsJob = async (job: any, otv: Constraints.OTV) => {
  const { jobType } = job.data;
  logger.info(`Processing type: ${jobType}`, constraintsLabel);
  switch (jobType) {
    case VALIDITY_JOB:
      await validityJob(otv);
      break;
    case SCORE_JOB:
      await scoreJob(otv);
      break;
  }
};
