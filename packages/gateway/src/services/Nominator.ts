import { queries } from "@1kv/common";

export const getNominators = async (): Promise<any> => {
  let allNominators = await queries.allNominators();
  allNominators = allNominators.sort((a, b) => a.avgStake - b.avgStake);
  return allNominators;
};

export const getNominator = async (stash): Promise<any> => {
  const nominator = await queries.getNominator(stash);
  return nominator;
};
