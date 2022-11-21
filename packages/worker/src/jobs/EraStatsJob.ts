import { logger, queries, ChainData } from "@1kv/common";

export const erastatsLabel = { label: "EraStatsJob" };

export const eraStatsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  const currentSession = await chaindata.getSession();
  const currentEra = await chaindata.getCurrentEra();
  const validators = await chaindata.currentValidators();

  // Try and store identities:
  for (const validator of validators) {
    const exists = await queries.getIdentity(validator);
    if (!exists) {
      // If an identity doesn't already exist, query and store it.
      const identity = await chaindata.getFormattedIdentity(validator);
      await queries.setIdentity(identity);
    }
  }

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
  const executionTime = (end - start) / 1000;

  logger.info(`Done (${executionTime}s)`, erastatsLabel);
};

export const processEraStatsJob = async (job: any, chaindata: ChainData) => {
  await eraStatsJob(chaindata);
};
