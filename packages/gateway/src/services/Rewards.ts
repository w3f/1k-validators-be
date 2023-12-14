import { queries } from "@1kv/common";

export const getRewardsValidatorTotal = async (stash): Promise<any> => {
  return await queries.getTotalValidatorRewards(stash);
};

export const getRewardsAllValidatorsTotal = async (): Promise<any> => {
  return await queries.getRewardsAllValidatorsTotal();
};

export const getRewardsValidatorStats = async (stash): Promise<any> => {
  const stats = await queries.getValidatorStats(stash);

  return stats;
};

export const getRewardsAllValidatorsStats = async (): Promise<any> => {
  const stats = await queries.getAllValidatorStats();

  return stats;
};

export const getRewardsAllNominatorsTotal = async (): Promise<any> => {
  const total = await queries.getRewardsAllNominatorsTotal();

  return total;
};

export const getRewardsNominatorTotal = async (stash): Promise<any> => {
  const total = await queries.getTotalNominatorRewards(stash);

  return total;
};

export const getRewardsValidator = async (stash): Promise<any> => {
  const rewards = await queries.getRewardsByValidator(stash);

  return rewards;
};

export const getRewardsNominator = async (stash): Promise<any> => {
  const rewards = await queries.getRewardsByNominator(stash);

  return rewards;
};
