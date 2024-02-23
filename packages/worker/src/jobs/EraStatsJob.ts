import { ChainData, logger, queries, Util } from "@1kv/common";

export const erastatsLabel = { label: "EraStatsJob" };

export const eraStatsJob = async (chaindata: ChainData) => {
  try {
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

    await queries.setValidatorSet(currentSession, currentEra, validators);

    for (let i = currentEra; i > 20; i--) {
      if (await queries.validatorSetExistsForEra(i)) {
        continue;
      }
      logger.info(
        `Adding Validator Set for Era: ${i} (${currentEra - i}/${currentEra})`,
        erastatsLabel,
      );
      const validators = await chaindata.getValidatorsAtEra(i);
      const session = await chaindata.getSessionAtEra(i);
      await queries.setValidatorSet(session, i, validators);
    }
    await Util.setValidatorRanks();

    const allCandidates = await queries.allCandidates();
    const valid = allCandidates.filter((candidate) => candidate.valid);
    const active = allCandidates.filter((candidate) => candidate.active);

    await queries.setEraStats(
      Number(currentEra),
      allCandidates.length,
      valid.length,
      active.length,
    );
  } catch (e) {
    logger.error(`Error running era stats job: ${e}`, erastatsLabel);
  }
};

export const eraStatsJobWithTiming = Util.withExecutionTimeLogging(
  eraStatsJob,
  erastatsLabel,
  "Era Stats Job Done",
);

export const processEraStatsJob = async (job: any, chaindata: ChainData) => {
  await eraStatsJob(chaindata);
};
