import { logger, queries, ChainData } from "@1kv/common";

export const erastatsLabel = { label: "EraStatsJob" };

export const eraStatsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  logger.info(`Running era stats cron`, erastatsLabel);

  const currentSession = await chaindata.getSession();
  const currentEra = await chaindata.getCurrentEra();
  const validators = await chaindata.getValidators();

  await queries.setLatestValidatorSet(currentSession, currentEra, validators);

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

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, erastatsLabel);
};

export const processEraStatsJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Era Stats Job....`, erastatsLabel);
  await eraStatsJob(chaindata);
};
