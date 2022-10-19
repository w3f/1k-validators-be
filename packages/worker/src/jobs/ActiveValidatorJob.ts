import { Queue } from "bullmq";
import { logger, Db, ChainData, ApiHandler } from "@1kv/common";

export const activeValidatorJob = async (db, chaindata: ChainData) => {
  const start = Date.now();

  // The current active validators in the validator set.
  const activeValidators = await chaindata.currentValidators();

  const candidates = await db.allCandidates();
  for (const candidate of candidates) {
    // Set if the validator is active in the set
    const active = activeValidators.includes(candidate.stash);
    await db.setActive(candidate.stash, active);
  }

  const end = Date.now();

  logger.info(
    `{cron::ActiveValidatorJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};
