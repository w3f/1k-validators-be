import { logger, queries, ChainData } from "@1kv/common";

export const nominatorLabel = { label: "NominatorJob" };

export const nominatorJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const [activeEra] = await chaindata.getActiveEraIndex();

  const nominators = await chaindata.getNominators();

  const candidates = await queries.allCandidates();

  for (const candidate of candidates) {
    // A validators active nominators
    const { total, others } = await chaindata.getExposure(
      activeEra,
      candidate.stash
    );
    const allNominators = await Promise.all(
      nominators.filter((nom) => {
        return nom?.targets?.includes(candidate.stash);
      })
    );
    const inactiveNominators = allNominators.filter((nominator) => {
      let active = false;
      others.forEach((other) => {
        if (other.address === nominator.address) {
          active = true;
        }
      });
      return !active;
    });

    let totalInactiveStake = 0;
    inactiveNominators.forEach((nominator) => {
      totalInactiveStake += nominator.bonded;
    });

    await queries.setNominatorStake(
      candidate.stash,
      activeEra,
      total,
      totalInactiveStake,
      others,
      inactiveNominators
    );
  }

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, nominatorLabel);
};

export const processNominatorJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Nominator Job....`, nominatorLabel);
  await nominatorJob(chaindata);
};
