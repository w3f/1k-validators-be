import { logger, queries, ChainData } from "@1kv/common";

export const validatorPrefLabel = { label: "ValidatorPrefJob" };

export const validatorPrefJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const candidates = await queries.allCandidates();

  for (const candidate of candidates) {
    // Set Identity
    const identity = await chaindata.getFormattedIdentity(candidate.stash);
    await queries.setIdentity(candidate.stash, identity);

    // Set Commission
    const [commission, err] = await chaindata.getCommission(candidate.stash);
    const formattedCommission =
      commission == 0 ? 0 : commission / Math.pow(10, 7);
    await queries.setCommission(candidate.stash, formattedCommission);

    // Set Controller
    const controller = await chaindata.getControllerFromStash(candidate.stash);
    await queries.setController(candidate.stash, controller);

    // Set reward destination
    const rewardDestination = await chaindata.getRewardDestination(
      candidate.stash
    );
    await queries.setRewardDestination(candidate.stash, rewardDestination);

    // set bonded amount
    const [bonded, err2] = await chaindata.getBondedAmount(candidate.stash);
    await queries.setBonded(candidate.stash, bonded);
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, validatorPrefLabel);
};

export const processValidatorPrefJob = async (
  job: any,
  chaindata: ChainData
) => {
  logger.info(`Processing Validator Pref Job....`, validatorPrefLabel);
  await validatorPrefJob(chaindata);
};
