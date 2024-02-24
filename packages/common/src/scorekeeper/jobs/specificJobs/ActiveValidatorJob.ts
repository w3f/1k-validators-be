import { ChainData, logger, Models, queries, Util } from "../../../index";
import { jobsMetadata } from "../JobsClass";

export const activeLabel = { label: "ActiveValidatorJob" };

export const individualActiveValidatorJob = async (
  chaindata: ChainData,
  candidate: Models.Candidate,
) => {
  try {
    const latestValidatorSet = await queries.getLatestValidatorSet();
    if (latestValidatorSet) {
      // Set if the validator is active in the set
      const active = latestValidatorSet?.validators?.includes(candidate.stash);
      const changed = candidate.active != active;
      if (changed) {
      }
      await queries.setActive(candidate.stash, active);
    }
  } catch (e) {
    logger.error(`Error setting active: ${e}`, activeLabel);
  }
};

export const activeValidatorJob = async (
  metadata: jobsMetadata,
): Promise<boolean> => {
  try {
    const { chaindata, jobStatusEmitter } = metadata;
    const candidates = await queries.allCandidates();

    // Calculate total number of candidates
    const totalCandidates = candidates.length;
    let processedCandidates = 0;

    for (const candidate of candidates) {
      await individualActiveValidatorJob(chaindata, candidate);

      // Increment processed candidates count
      processedCandidates++;

      // Calculate progress percentage
      const progress = (processedCandidates / totalCandidates) * 100;

      // Emit progress update
      jobStatusEmitter.emit("jobProgress", {
        name: "Active Validator Job",
        progress,
        updated: Date.now(),
      });
    }
    return true;
  } catch (e) {
    logger.error(`Error running active validator job: ${e}`, activeLabel);
    return false;
  }
};

export const activeValidatorJobWithTiming = Util.withExecutionTimeLogging(
  activeValidatorJob,
  activeLabel,
  "Active Validator Job Done",
);

export const processActiveValidatorJob = async (
  job: any,
  metadata: jobsMetadata,
) => {
  logger.info(`Processing Active Validator Job....`, activeLabel);
  await activeValidatorJob(metadata);
};
