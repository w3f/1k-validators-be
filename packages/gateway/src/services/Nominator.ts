import { queries } from "@1kv/common";

export const getNominators = async (): Promise<any> => {
  return await queries.allNominators();
};

export const getNominator = async (stash): Promise<any> => {
  const nominator = await queries.getNominator(stash);
  return nominator;
};
