import { SCORE_JOB, VALIDITY_JOB } from "./index";
import { JobEvent, JobInfo, JobRunnerMetadata, JobStatus } from "../types";
import {
  allCandidates,
  getLatestValidatorScoreMetadata,
  validCandidates,
} from "../../../db";
import {
  percentage,
  timeRemaining,
  withExecutionTimeLogging,
} from "../../../utils";
import { jobStatusEmitter } from "../../../Events";
import logger from "../../../logger";
import { JobKey } from "../types";

export const constraintsLabel = { label: "ConstraintsJob" };

export const validityJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { constraints } = metadata;
    const candidates = await allCandidates();
    const validators = await metadata.chaindata.getValidators();
    logger.info(`Checking ${candidates.length} candidates`, constraintsLabel);

    // Calculate total number of candidates
    const totalCandidates = candidates.length;

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      const isValid = await constraints.checkCandidate(candidate, validators);
      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(index + 1, totalCandidates, end - start);
      const progress = ((index + 1) / totalCandidates) * 100;

      // Emit progress update with candidate name in the iteration
      jobStatusEmitter.emit(JobEvent.Progress, {
        name: JobKey.Validity,
        progress,
        iteration: `${isValid ? "✅ " : "❌ "} ${candidate.name}`,
      });

      logger.info(
        `Checked ${candidate.name}: ${isValid} [${index + 1}/${totalCandidates}] ${percentage(index + 1, totalCandidates)} ${time} ${remaining}`,
        constraintsLabel,
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error running validity job: ${e}`, constraintsLabel);
    jobStatusEmitter.emit(JobEvent.Failed, {
      status: JobStatus.Failed,
      name: JobKey.Validity,
      error: JSON.stringify(e),
    });
    return false;
  }
};

export const validityJobWithTiming = withExecutionTimeLogging(
  validityJob,
  constraintsLabel,
  "Validity Job Done",
);

export const scoreJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { constraints } = metadata;
    await constraints.scoreAllCandidates();

    const candidates = await validCandidates();
    await constraints.setScoreMetadata();
    const scoreMetadata = await getLatestValidatorScoreMetadata();

    // Calculate total number of candidates
    const totalCandidates = candidates.length;

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      const score = await constraints.scoreCandidate(candidate, scoreMetadata);

      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(index + 1, totalCandidates, end - start);
      const progress = ((index + 1) / totalCandidates) * 100;

      // Emit progress update including the candidate name
      jobStatusEmitter.emit(JobEvent.Progress, {
        name: JobKey.Score,
        progress,
        iteration: `[${score?.toFixed(1)}]  ${candidate.name}`,
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
    const errorInfo: JobInfo = {
      status: JobStatus.Failed,
      name: JobKey.Score,
      error: JSON.stringify(e),
    };
    jobStatusEmitter.emit(JobEvent.Failed, errorInfo);
    return false;
  }
};

export const scoreJobWithTiming = withExecutionTimeLogging(
  scoreJob,
  constraintsLabel,
  "Score Job Done",
);

// Called by worker to process Job
export const processConstraintsJob = async (
  job: any,
  metadata: JobRunnerMetadata,
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
