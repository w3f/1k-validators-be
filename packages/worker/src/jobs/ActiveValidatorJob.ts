import { ChainData, logger, Models, queries, Util } from "@1kv/common";

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

export const activeValidatorJob = async (chaindata: ChainData) => {
  const candidates = await queries.allCandidates();
  for (const candidate of candidates) {
    await individualActiveValidatorJob(chaindata, candidate);
  }
};

export const activeValidatorJobWithTiming = Util.withExecutionTimeLogging(
  activeValidatorJob,
  activeLabel,
  "Active Validator Job Done",
);

export const processActiveValidatorJob = async (
  job: any,
  chaindata: ChainData,
) => {
  logger.info(`Processing Active Validator Job....`, activeLabel);
  await activeValidatorJob(chaindata);
};
