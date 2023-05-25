import { ChainData, logger, queries } from "@1kv/common";

export const delegationLabel = { label: "DelegationJob" };

export const delegationJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const chainType = await chaindata.getChainType();

  if (chainType == "Kusama") {
    try {
      const delegations = await chaindata.getOpenGovDelegations();
      await queries.wipeOpenGovDelegations();
      for (const delegation of delegations) {
        await queries.addOpenGovDelegation(delegation);
      }
    } catch (e) {
      logger.error(e);
    }
  } else {
    const delegators = await chaindata.getDelegators();

    const candidates = await queries.allCandidates();

    for (const candidate of candidates) {
      // LEGACY DELEGATIONS
      const delegating = delegators.filter((delegator) => {
        if (delegator.target == candidate.stash) return true;
      });

      let totalBalance = 0;
      for (const delegator of delegating) {
        totalBalance += delegator.effectiveBalance;
      }

      await queries.setDelegation(candidate.stash, totalBalance, delegating);
    }
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, delegationLabel);
};

export const processDelegationJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Delegation Job....`, delegationLabel);
  await delegationJob(chaindata);
};
