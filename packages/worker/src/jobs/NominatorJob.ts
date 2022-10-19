import { Queue } from "bullmq";
import { logger, Db, ChainData, ApiHandler } from "@1kv/common";

export const nominatorJob = async (db: Db, chaindata: ChainData) => {
  const start = Date.now();

  const [activeEra, err] = await chaindata.getActiveEraIndex();

  const nominators = await chaindata.getNominators();

  const candidates = await db.allCandidates();

  for (const candidate of candidates) {
    // A validators active nominators
    const { total, others } = await chaindata.getExposure(
      activeEra,
      candidate.stash
    );
    const allNominators = await Promise.all(
      nominators.filter((nom) => {
        return nom.targets.includes(candidate.stash);
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

    await db.setNominatorStake(
      candidate.stash,
      activeEra,
      total,
      totalInactiveStake,
      others,
      inactiveNominators
    );
  }

  const end = Date.now();

  logger.info(
    `{cron::NominatorStakeJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// export const processEraStatsJob = async (
//     job: any,
//     db: Db,
//     chaindata: ChainData
// ) => {
//     logger.info(`Processing Era Stats Job....`);
//     await eraStatsJob(db, chaindata);
// };
