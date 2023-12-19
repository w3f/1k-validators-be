import { ChainData, logger, queries } from "@1kv/common";

export const sessionkeyLabel = { label: "SessionKeyJob" };

export const sessionKeyJob = async (chaindata: ChainData) => {
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
        // await queries.setQueuedKeys(candidate.stash, key.keys);
        // logger.info(JSON.stringify(key.keys), sessionkeyLabel);
      }
    }

    // Set Next Keys
    const nextKeys = await chaindata.getNextKeys(validator);

    //   if (nextKeys?.toJSON()) {
    //     const {
    //       grandpa = "",
    //       babe = "",
    //       imOnline = "",
    //       paraValidator = "",
    //       paraAssignment = "",
    //       authorityDiscovery = "",
    //       beefy = "",
    //     } = nextKeys?.toJSON();
    //     logger.info(`grandpa: ${grandpa}`, sessionkeyLabel);
    //     logger.info(`babe: ${babe}`, sessionkeyLabel);
    //     logger.info(`imOnline: ${imOnline}`, sessionkeyLabel);
    //     logger.info(`paraValidator: ${paraValidator}`, sessionkeyLabel);
    //     logger.info(`paraAssignment: ${paraAssignment}`, sessionkeyLabel);
    //     logger.info(`authorityDiscovery: ${authorityDiscovery}`, sessionkeyLabel);
    //     logger.info(`beefy: ${beefy}`, sessionkeyLabel);
    //
    //     await queries.setValidatorKeys(validator, nextKeys?.toJSON());
    //
    //     for (const candidate of candidates) {
    //       if (candidate.stash == validator) {
    //         await queries.setNextKeys(candidate.stash, nextKeys.toHex());
    //       }
    //     }
    //     // await queries.setNextKeys(candidate.stash, nextKeys);
    //   }
    // }

    // let count = 0;
    // const vals = await queries.getValidators();
    // for (const validator of vals) {
    //   if (validator.keys.beefy) {
    //     count++;
    //   }
  }

  // logger.info(
  //   `number of validators with beefy: ${count} / ${vals.length}`,
  //   sessionkeyLabel
  // );

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, sessionkeyLabel);
};

export const processSessionKeyJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Session Key Job....`, sessionkeyLabel);
  await sessionKeyJob(chaindata);
};
