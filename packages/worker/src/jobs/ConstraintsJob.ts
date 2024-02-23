import { Constraints, logger, queries } from "@1kv/common";
import { SCORE_JOB, VALIDITY_JOB } from "./index";

export const constraintsLabel = { label: "ConstraintsJob" };

export const validityJob = async (constraints: Constraints.OTV) => {
  try {
    const start = Date.now();

    logger.info(`Running Constraints:Validity job`, constraintsLabel);

    await constraints.checkAllCandidates();

    const end = Date.now();

    logger.info(
      `Validity Done. Took ${(end - start) / 1000} seconds`,
      constraintsLabel,
    );
  } catch (e) {
    logger.error(`Error running validity job: ${e}`, constraintsLabel);
  }
};

export const candidateValidityJob = async (
  constraints: Constraints.OTV,
  candidateAddress: string,
) => {
  try {
    const start = Date.now();

    const candidate = await queries.getCandidate(candidateAddress);
    await constraints.checkCandidate(candidate);

    const end = Date.now();
    const executionTime = (end - start) / 1000;

    logger.info(
      `validity for ${candidate.name} Done. (${executionTime}s)`,
      constraintsLabel,
    );
  } catch (e) {
    logger.error(`Error running validity job: ${e}`, constraintsLabel);
  }
};

export const individualScoreJob = async (
  constraints: Constraints.OTV,
  candidateAddress: string,
) => {
  try {
    const start = Date.now();
    const candidate = await queries.getCandidate(candidateAddress);
    let scoreMetadata = await queries.getLatestValidatorScoreMetadata();
    if (!scoreMetadata) {
      logger.warn(
        `no score metadata, cannot score candidates`,
        constraintsLabel,
      );
      await constraints.setScoreMetadata();
      scoreMetadata = await queries.getLatestValidatorScoreMetadata();
    }
    await constraints.scoreCandidate(candidate, scoreMetadata);

    const end = Date.now();
    const executionTime = (end - start) / 1000;
  } catch (e) {
    logger.error(`Error running individual score job: ${e}`, constraintsLabel);
  }
};

export const scoreJob = async (constraints: Constraints.OTV) => {
  try {
    const start = Date.now();

    logger.info(`Running Constraints:Score job`, constraintsLabel);

    await constraints.scoreAllCandidates();

    const end = Date.now();

    logger.info(
      `Score Done. Took ${(end - start) / 1000} seconds`,
      constraintsLabel,
    );
  } catch (e) {
    logger.error(`Error running score job: ${e}`, constraintsLabel);
  }
};

// Called by worker to process Job
export const processConstraintsJob = async (job: any, otv: Constraints.OTV) => {
  const { jobType } = job.data;
  switch (jobType) {
    case VALIDITY_JOB:
      await validityJob(otv);
      break;
    case SCORE_JOB:
      await scoreJob(otv);
      break;
  }
};
