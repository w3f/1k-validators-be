import { ChainData, logger, queries } from "@1kv/common";

export const delegationLabel = { label: "DelegationJob" };

export const delegationJob = async (chaindata: ChainData) => {
  const start = Date.now();

  try {
    const delegations = await chaindata.getOpenGovDelegations();
    await queries.wipeOpenGovDelegations();
    logger.info(`Adding ${delegations.length} delegations`, delegationLabel);
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
  logger.info(`Delegation Job Processed!`, delegationLabel);
};
