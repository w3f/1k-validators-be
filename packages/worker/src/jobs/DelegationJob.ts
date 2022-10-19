import { logger, Db, ChainData } from "@1kv/common";

export const delegationJob = async (db: Db, chaindata: ChainData) => {
  const start = Date.now();

  const delegators = await chaindata.getDelegators();

  const candidates = await db.allCandidates();

  for (const candidate of candidates) {
    const delegating = delegators.filter((delegator) => {
      if (delegator.target == candidate.stash) return true;
    });

    let totalBalance = 0;
    for (const delegator of delegating) {
      totalBalance += delegator.effectiveBalance;
    }

    await db.setDelegation(candidate.stash, totalBalance, delegating);
  }

  const end = Date.now();

  logger.info(
    `{cron::delegationJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const processDelegationJob = async (
  job: any,
  db: Db,
  chaindata: ChainData
) => {
  logger.info(`Processing Delegation Job....`);
  await delegationJob(db, chaindata);
};
