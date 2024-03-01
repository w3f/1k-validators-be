import { ChainData, logger, Models, queries } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";
import { JobNames } from "../JobConfigs";

export const activeLabel = { label: "ActiveValidatorJob" };

export class ActiveValidatorJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const individualActiveValidatorJob = async (
  chaindata: ChainData,
  candidate: Models.Candidate,
): Promise<boolean> => {
  try {
    const latestValidatorSet = await queries.getLatestValidatorSet();
    if (latestValidatorSet) {
      // Set if the validator is active in the set
      const active = latestValidatorSet?.validators?.includes(candidate.stash);
      const changed = candidate.active != active;
      if (changed) {
      }
      await queries.setActive(candidate.stash, active);
      return active;
    }
    return false;
  } catch (e) {
    logger.error(`Error setting active: ${e}`, activeLabel);
    return false;
  }
};

export const activeValidatorJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
    const candidates = await queries.allCandidates();

    // Calculate total number of candidates
    const totalCandidates = candidates.length;
    let processedCandidates = 0;

    for (const candidate of candidates) {
      const isActive = await individualActiveValidatorJob(chaindata, candidate);

      // Increment processed candidates count
      processedCandidates++;

      // Calculate progress percentage
      const progress = (processedCandidates / totalCandidates) * 100;

      // Emit progress update with candidate name as the iteration
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.ActiveValidator,
        progress,
        updated: Date.now(),
        iteration: `${isActive ? "✅ " : "❌ "} ${candidate.name}`,
      });
    }
    return true;
  } catch (e) {
    logger.error(`Error running active validator job: ${e}`, activeLabel);
    return false;
  }
};

export const activeValidatorJobWithTiming = withExecutionTimeLogging(
  activeValidatorJob,
  activeLabel,
  "Active Validator Job Done",
);

export const processActiveValidatorJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  logger.info(`Processing Active Validator Job....`, activeLabel);
  await activeValidatorJob(metadata);
};
