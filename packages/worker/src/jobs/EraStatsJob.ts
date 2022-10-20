import { logger, Db, ChainData } from "@1kv/common";

export const eraStatsJob = async (db: Db, chaindata: ChainData) => {
  const start = Date.now();

  logger.info(`(cron::eraStats::start) Running era stats cron`);

  const currentEra = await chaindata.getCurrentEra();

  const allCandidates = await db.allCandidates();

  const valid = allCandidates.filter((candidate) => candidate.valid);
  const active = allCandidates.filter((candidate) => candidate.active);

  await db.setEraStats(
    Number(currentEra),
    allCandidates.length,
    valid.length,
    active.length
  );

  const end = Date.now();

  logger.info(
    `{cron::eraStats::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const processEraStatsJob = async (
  job: any,
  db: Db,
  chaindata: ChainData
) => {
  logger.info(`Processing Era Stats Job....`);
  await eraStatsJob(db, chaindata);
};
