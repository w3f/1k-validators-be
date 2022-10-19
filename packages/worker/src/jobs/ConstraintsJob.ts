import { ApiHandler, Db, logger, Constraints } from "@1kv/common";

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

// export const constraintsJob = async (db: Db) => {
//   const start = Date.now();
//
//   logger.info(`(job::Constraints::start) Running Constraints job`);
//
//   const end = Date.now();
//
//   logger.info(
//     `{job::Constraints::ExecutionTime} started at ${new Date(
//       start
//     ).toString()} Done. Took ${(end - start) / 1000} seconds`
//   );
// };

const VALIDITYJOB = "validityJob";
const SCOREJOB = "scoreJob";
// Called by worker to process Job
export const processConstraintsJob = async (job: any, otv: Constraints.OTV) => {
  const { jobType } = job.data;
  logger.info(`Processing type: ${jobType}`);
  switch (jobType) {
    case VALIDITYJOB:
      await validityJob(otv);
      break;
    case SCOREJOB:
      await scoreJob(otv);
      break;
  }
};
