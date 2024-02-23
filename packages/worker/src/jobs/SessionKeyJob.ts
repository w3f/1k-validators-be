import { ChainData, logger, queries } from "@1kv/common";

export const sessionkeyLabel = { label: "SessionKeyJob" };

export const sessionKeyJob = async (chaindata: ChainData) => {
  try {
    const start = Date.now();

    const candidates = await queries.allCandidates();

    // TODO Query ALL VALIDATORS

    const validators = await chaindata.getValidators();
    logger.info(`number of validators: ${validators.length}`, sessionkeyLabel);

    // All queued keys
    const queuedKeys = await chaindata.getQueuedKeys();

    for (const validator of validators) {
      // Set queued keys
      for (const key of queuedKeys) {
        if (key.address == validator) {
          // await queries.setQueuedKeys(validator, key.keys);
          // logger.info(JSON.stringify(key.keys), sessionkeyLabel);
        }
      }

      // Set Next Keys
      const nextKeys = await chaindata.getNextKeys(validator);

      if (nextKeys?.toJSON()) {
        await queries.setValidatorKeys(validator, nextKeys?.toJSON());

        for (const candidate of candidates) {
          if (candidate.stash == validator) {
            await queries.setNextKeys(candidate.stash, nextKeys.toHex());
          }
        }
      }
    }

    const end = Date.now();

    logger.info(`Done. Took ${(end - start) / 1000} seconds`, sessionkeyLabel);
  } catch (e) {
    logger.error(`Error running session key job: ${e}`, sessionkeyLabel);
  }
};

export const processSessionKeyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Session Key Job....`, sessionkeyLabel);
  await sessionKeyJob(chaindata);
};
