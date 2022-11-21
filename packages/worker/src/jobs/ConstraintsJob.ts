import { logger, Constraints, queries } from "@1kv/common";
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

export const candidateValidityJob = async (
  constraints: Constraints.OTV,
  candidateAddress: string
) => {
  const start = Date.now();

  const candidate = await queries.getCandidate(candidateAddress);
  await constraints.checkCandidate(candidate);

  const end = Date.now();
  const executionTime = (end - start) / 1000;

  logger.info(
    `validity for ${candidate.name} Done. (${executionTime}s)`,
    constraintsLabel
  );
};

export const individualScoreJob = async (
  constraints: Constraints.OTV,
  candidateAddress: string
) => {
  const start = Date.now();
  const candidate = await queries.getCandidate(candidateAddress);
  let scoreMetadata = await queries.getLatestValidatorScoreMetadata();
  if (!scoreMetadata) {
    logger.warn(`no score metadata, cannot score candidates`, constraintsLabel);
    await constraints.setScoreMetadata();
    scoreMetadata = await queries.getLatestValidatorScoreMetadata();
  }
  await constraints.scoreCandidate(candidate, scoreMetadata);

  const end = Date.now();
  const executionTime = (end - start) / 1000;
  // logger.info(`scored: ${candidate.name} (${executionTime}s)`);
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
  const { jobType, candidateAddress } = job.data;
  // logger.info(`Processing type: ${jobType}`, constraintsLabel);
  switch (jobType) {
    case VALIDITY_JOB:
      if (candidateAddress) {
        await candidateValidityJob(otv, candidateAddress);
      } else {
        await validityJob(otv);
      }

      break;
    case SCORE_JOB:
      if (candidateAddress) {
        await individualScoreJob(otv, candidateAddress);
      } else {
        await scoreJob(otv);
      }
      break;
  }
};
