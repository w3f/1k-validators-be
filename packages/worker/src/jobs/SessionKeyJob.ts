import { logger, queries, ChainData } from "@1kv/common";

export const sessionkeyLabel = { label: "SessionKeyJob" };

export const sessionKeyJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const candidates = await queries.allCandidates();

  // All queued keys
  const queuedKeys = await chaindata.getQueuedKeys();

  for (const candidate of candidates) {
    // Set queued keys
    for (const key of queuedKeys) {
      if (key.address == candidate.stash) {
        await queries.setQueuedKeys(candidate.stash, key.keys);
      }
    }

    // Set Next Keys
    const nextKeys = await chaindata.getNextKeys(candidate.stash);
    await queries.setNextKeys(candidate.stash, nextKeys);
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, sessionkeyLabel);
};

export const processSessionKeyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Session Key Job....`, sessionkeyLabel);
  await sessionKeyJob(chaindata);
};
