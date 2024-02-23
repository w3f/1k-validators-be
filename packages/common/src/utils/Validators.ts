import {
  allCandidates,
  candidateExistsByStash,
  getAllValidatorSets,
  getIdentityAddresses,
  setRank,
} from "../db";
import logger from "../logger";

export const setValidatorRanks = async () => {
  const rankMap: Map<string, number> = new Map();
  const candidates = await allCandidates();
  const validatorSets = await getAllValidatorSets();
  for (const era of validatorSets) {
    const validators = era.validators;

    for (const validator of validators) {
      logger.info(`Checking validator: ${validator}`);
      const candidateExists = await candidateExistsByStash(validator);
      if (candidateExists) {
        if (rankMap.has(validator)) {
          rankMap.set(validator, rankMap.get(validator) + 1);
        } else {
          rankMap.set(validator, 1);
        }
      }
    }
  }
  await processRanks(rankMap);
  logger.info(`Rank Map: ${JSON.stringify(Array.from(rankMap.entries()))}`);
};

export const processRanks = async (
  rankMap: Map<string, number>,
): Promise<void[]> => {
  const eraPointsList: { address: string; eras: number }[] = [];
  return await Promise.all(
    Array.from(rankMap.entries()).map(async ([validator, rank]) => {
      const identityAddresses: string[] = await getIdentityAddresses(validator);
      for (const identityAddress of identityAddresses) {
        const eras = rankMap.get(identityAddress);
        eraPointsList.push({ address: identityAddress, eras: eras });
      }
      const sortedEraPointsList = eraPointsList.sort((a, b) => b.eras - a.eras);
      const maxRank: number = Math.max(
        ...sortedEraPointsList.map((entry) => entry.eras),
      );

      await setRank(validator, maxRank);
    }),
  );
};
