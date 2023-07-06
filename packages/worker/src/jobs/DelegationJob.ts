import { ChainData, logger, queries } from "@1kv/common";

export const delegationLabel = { label: "DelegationJob" };

export const delegationJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const chainType = await chaindata.getChainType();

  try {
    const delegations = await chaindata.getOpenGovDelegations();
    await queries.wipeOpenGovDelegations();
    for (const delegation of delegations) {
      await queries.addOpenGovDelegation(delegation);
    }
  } catch (e) {
    logger.error(`Could not query delegations`, delegationLabel);
    logger.error(e, delegationLabel);
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, delegationLabel);
};

export const processDelegationJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Delegation Job....`, delegationLabel);
  await delegationJob(chaindata);
};
