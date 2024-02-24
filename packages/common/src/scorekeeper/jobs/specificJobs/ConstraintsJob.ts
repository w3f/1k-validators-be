import { Constraints, logger, queries, Util } from "../../../index";
import { SCORE_JOB, VALIDITY_JOB } from "./index";
import { jobsMetadata } from "../JobsClass";
import {
  allCandidates,
  getLatestValidatorScoreMetadata,
  validCandidates,
} from "../../../db";
import { percentage, timeRemaining } from "../../../utils";

export const constraintsLabel = { label: "ConstraintsJob" };

export const validityJob = async (metadata: jobsMetadata): Promise<boolean> => {
  try {
    const { constraints, jobStatusEmitter } = metadata;
    const candidates = await allCandidates();
    logger.info(`Checking ${candidates.length} candidates`, constraintsLabel);

    // Calculate total number of candidates
    const totalCandidates = candidates.length;

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      const isValid = await constraints.checkCandidate(candidate);
      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(index + 1, totalCandidates, end - start);
      const progress = ((index + 1) / totalCandidates) * 100;

      // Emit progress update with candidate name in the iteration
      jobStatusEmitter.emit("jobProgress", {
        name: "Validity Job",
        progress,
        updated: Date.now(),
        iteration: `Candidate name: ${candidate.name}`,
      });

      logger.info(
        `Checked ${candidate.name}: ${isValid} [${index + 1}/${totalCandidates}] ${percentage(index + 1, totalCandidates)} ${time} ${remaining}`,
        constraintsLabel,
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error running validity job: ${e}`, constraintsLabel);
    return false;
  }
};

export const validityJobWithTiming = Util.withExecutionTimeLogging(
  validityJob,
  constraintsLabel,
  "Validity Job Done",
);

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

export const scoreJob = async (metadata: jobsMetadata): Promise<boolean> => {
  try {
    const { constraints, jobStatusEmitter } = metadata;
    await constraints.scoreAllCandidates();

    const candidates = await validCandidates();
    await constraints.setScoreMetadata();
    const scoreMetadata = await getLatestValidatorScoreMetadata();

    // Calculate total number of candidates
    const totalCandidates = candidates.length;

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      await constraints.scoreCandidate(candidate, scoreMetadata);

      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(index + 1, totalCandidates, end - start);
      const progress = ((index + 1) / totalCandidates) * 100;

      // Emit progress update including the candidate name
      jobStatusEmitter.emit("jobProgress", {
        name: "Score Job",
        progress,
        updated: Date.now(),
        iteration: `Scored candidate ${candidate.name}`,
      });

      logger.info(
        `scored ${candidate.name}: [${index + 1} / ${totalCandidates}] ${percentage(index + 1, totalCandidates)} ${time} ${remaining}`,
        {
          label: "Constraints",
        },
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error running score job: ${e}`, constraintsLabel);
    return false;
  }
};

export const scoreJobWithTiming = Util.withExecutionTimeLogging(
  scoreJob,
  constraintsLabel,
  "Score Job Done",
);

// Called by worker to process Job
export const processConstraintsJob = async (
  job: any,
  metadata: jobsMetadata,
) => {
  const { jobType } = job.data;
  switch (jobType) {
    case VALIDITY_JOB:
      await validityJob(metadata);
      break;
    case SCORE_JOB:
      await scoreJob(metadata);
      break;
  }
};
