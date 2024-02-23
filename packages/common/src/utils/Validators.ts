import {
  allCandidates,
  getAllValidatorSets,
  getIdentityAddresses,
  setRank,
} from "../db";

export const setValidatorRanks = async () => {
  const rankMap: Map<string, number> = new Map();
  const candidates = await allCandidates();
  const candidateAddresses = candidates.map((candidate) => candidate.stash);
  const validatorSets = await getAllValidatorSets();
  for (const era of validatorSets) {
    const validators = era.validators;

    for (const validator of validators) {
      const candidateExists = candidateAddresses.includes(validator);
      if (candidateExists) {
        if (rankMap.has(validator)) {
          rankMap.set(validator, rankMap.get(validator) + 1);
        } else {
          rankMap.set(validator, 1);
        }
      }
    }
  }
  await processRankMap(rankMap);
};

export const processRankMap = async (
  rankMap: Map<string, number>,
): Promise<void[]> => {
  return await Promise.all(
    Array.from(rankMap.entries()).map(async ([validator, rank]) => {
      const rankList: { address: string; rank: number }[] = [];
      const identityAddresses: string[] = await getIdentityAddresses(validator);
      for (const identityAddress of identityAddresses) {
        rankList.push({ address: identityAddress, rank: rank });
      }
      const sortedRankList = rankList.sort((a, b) => b.rank - a.rank);
      const maxRank: number = Math.max(
        ...sortedRankList.map((entry) => entry.rank),
      );

      await setRank(validator, maxRank);
    }),
  );
};
