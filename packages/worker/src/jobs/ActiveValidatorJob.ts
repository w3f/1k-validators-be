import { logger, queries, ChainData } from "@1kv/common";

export const activeLabel = { label: "ActiveValidatorJob" };

export const activeValidatorJob = async (chaindata: ChainData) => {
  const start = Date.now();

  // The current active validators in the validator set.
  const activeValidators = await chaindata.currentValidators();

  const candidates = await queries.allCandidates();
  for (const candidate of candidates) {
    // Set if the validator is active in the set
    const active = activeValidators.includes(candidate.stash);
    const changed = candidate.active != active;
    if (changed) {
      // logger.info(
      //   `${candidate.name} changed from being ${candidate.active} to ${active}`
      // );
    }
    await queries.setActive(candidate.stash, active);
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, activeLabel);
};

export const processActiveValidatorJob = async (
  job: any,
  chaindata: ChainData
) => {
  logger.info(`Processing Active Validator Job....`, activeLabel);
  await activeValidatorJob(chaindata);
};
