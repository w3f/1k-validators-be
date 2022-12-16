import { logger, queries, ChainData } from "@1kv/common";

export const delegationLabel = { label: "DelegationJob" };

export const delegationJob = async (chaindata: ChainData) => {
  const start = Date.now();

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

  // OPEN GOV DELEGATIONS
  const chainType = await chaindata.getChainType();
  if (chainType == "Kusama") {
    try {
      const convictionVoting = await chaindata.getConvictionVoting();
      const tracks = await chaindata.getTrackInfo();
      const { votes, delegations } = convictionVoting;

      for (const track of tracks) {
        const trackDelegations = delegations.filter((delegator) => {
          if (delegator.track == track.trackIndex) return true;
        });
      }
    } catch (e) {
      logger.error(e);
    }
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, delegationLabel);
};

export const processDelegationJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Delegation Job....`, delegationLabel);
  await delegationJob(chaindata);
};
