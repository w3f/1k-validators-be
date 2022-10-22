import { logger, queries, ChainData } from "@1kv/common";

export const eraStatsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  logger.info(`(cron::eraStats::start) Running era stats cron`);

  const currentEra = await chaindata.getCurrentEra();

  const allCandidates = await queries.allCandidates();

  const valid = allCandidates.filter((candidate) => candidate.valid);
  const active = allCandidates.filter((candidate) => candidate.active);

  await queries.setEraStats(
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

export const processEraStatsJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Era Stats Job....`);
  await eraStatsJob(chaindata);
};
