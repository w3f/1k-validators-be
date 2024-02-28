import { PayoutTransactionModel, Reward, RewardModel } from "../models";
import { getIdentity } from "./Candidate";

export const setPayoutTransaction = async (
  validator: string,
  era: number,
  submitter: string,
  blockHash: string,
  blockNumber: number,
  timestamp: number,
): Promise<boolean> => {
  const data = await PayoutTransactionModel.findOne({ validator, era }).lean();
  if (!data) {
    const payoutTransaction = new PayoutTransactionModel({
      validator,
      era,
      submitter,
      blockHash,
      blockNumber,
      timestamp,
    });
    await payoutTransaction.save();
    return true;
  } else {
    await PayoutTransactionModel.findOneAndUpdate(
      { validator, era },
      {
        submitter,
        blockHash,
        blockNumber,
        timestamp,
      },
    ).exec();
    return true;
  }
};

export const getPayoutTransaction = async (
  validator: string,
  era: number,
): Promise<any> => {
  return PayoutTransactionModel.findOne(
    { validator, era },
    { _id: 0, __v: 0 },
  ).lean();
};

export const setReward = async (
  role: string,
  exposurePercentage: number,
  exposure: number,
  totalStake: number,
  commission: number,
  era: number,
  validator: string,
  nominator: string,
  rewardAmount: number,
  rewardDestination: string,
  validatorStakeEfficiency: number,
  erasMinStake: number,
  blockHash: string,
  blockNumber: number,
  timestamp: number,
  date: string,
  chf: number,
  usd: number,
  eur: number,
): Promise<any> => {
  const data = await RewardModel.findOne({ validator, nominator, era }).lean();
  if (!data) {
    const reward = new RewardModel({
      role,
      exposurePercentage,
      exposure,
      totalStake,
      commission,
      era,
      validator,
      nominator,
      rewardAmount,
      rewardDestination,
      validatorStakeEfficiency,
      erasMinStake,
      blockHash,
      blockNumber,
      timestamp,
      date,
      chf,
      usd,
      eur,
    });
    await reward.save();
    return true;
  }

  await RewardModel.findOneAndUpdate(
    { validator, nominator, era },
    {
      role,
      exposurePercentage,
      exposure,
      totalStake,
      commission,
      rewardAmount,
      rewardDestination,
      validatorStakeEfficiency,
      erasMinStake,
      blockHash,
      blockNumber,
      timestamp,
      date,
      chf,
      usd,
      eur,
    },
  ).exec();
};

export const getReward = async (
  validator: string,
  nominator: string,
  era: number,
): Promise<any> => {
  return RewardModel.findOne(
    { validator, nominator, era },
    { _id: 0, __v: 0 },
  ).lean();
};

export const getRewards = async (
  validator: string,
  era: number,
): Promise<any> => {
  return RewardModel.find({ validator, era }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByEra = async (era: number): Promise<any> => {
  return RewardModel.find({ era }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByValidator = async (
  validator: string,
): Promise<any> => {
  return RewardModel.find({ validator }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByNominator = async (
  nominator: string,
): Promise<any> => {
  return RewardModel.find({ nominator }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByEraAndNominator = async (
  era: number,
  nominator: string,
): Promise<any> => {
  return RewardModel.find({ era, nominator }, { _id: 0, __v: 0 }).lean();
};

export const getValidatorStats = async (validator: string) => {
  const rewards = await RewardModel.find({
    validator,
    role: "validator",
  }).lean();
  let totalRewards = 0;
  let efficiency = 0;
  let stake = 0;

  for (const reward of rewards) {
    totalRewards += Number(reward.rewardAmount);
    efficiency += Number(reward.validatorStakeEfficiency);
    stake += Number(reward.totalStake);
  }
  return {
    total: totalRewards,
    rewardCount: rewards.length,
    avgEfficiency: efficiency / rewards.length,
    avgStake: stake / rewards.length,
  };
};

export const getAllValidatorStats = async () => {
  const rewards = await RewardModel.find({
    role: "validator",
  }).lean<Reward[]>();

  const rewardsMap = new Map<
    string,
    {
      numRewards: number;
      totalRewards: number;
      efficiency: number;
      stake: number;
      minStake: number;
      commission: number;
    }
  >();

  for (const reward of rewards) {
    if (reward.rewardAmount !== null && reward.rewardAmount !== undefined) {
      const numRewards = rewardsMap.get(reward.validator)?.numRewards || 0;
      const totalRewardsSum =
        rewardsMap.get(reward.validator)?.totalRewards || 0;
      const efficiencySum = rewardsMap.get(reward.validator)?.efficiency || 0;
      const stakeSum = rewardsMap.get(reward.validator)?.stake || 0;
      const minStake = rewardsMap.get(reward.validator)?.minStake || 0;
      const commission = rewardsMap.get(reward.validator)?.commission || 0;
      rewardsMap.set(reward.validator, {
        numRewards: numRewards + 1,
        totalRewards: totalRewardsSum + parseFloat(reward.rewardAmount),
        efficiency: efficiencySum + (reward.validatorStakeEfficiency || 0),
        stake: stakeSum + (reward.totalStake || 0),
        minStake: minStake + (reward.erasMinStake || 0),
        commission: commission + (reward.commission || 0),
      });
    }
  }

  const rewardsList = Array.from(rewardsMap.entries()).map(([key, value]) => ({
    validator: key,
    numRewards: value.numRewards,
    totalRewards: value.totalRewards,
    avgEfficiency: value.efficiency / value.numRewards,
    avgStake: value.stake / value.numRewards,
    avgEraMinStake: value.minStake / value.numRewards,
    avgCommission: value.commission / value.numRewards,
  }));

  const identityList = await Promise.all(
    rewardsList.map(async (reward) => {
      const identity = await getIdentity(reward.validator);
      return {
        ...reward,
        identity: identity,
      };
    }),
  );

  return identityList.sort((a, b) => b.avgEfficiency - a.avgEfficiency);
};

export const getTotalValidatorRewards = async (validator: string) => {
  const rewards = await RewardModel.find({
    validator,
    role: "validator",
  }).lean();
  let total = 0;
  for (const reward of rewards) {
    total += Number(reward.rewardAmount);
  }
  return {
    validator: validator,
    total: total,
    rewardCount: rewards.length,
  };
};

export const getRewardsAllValidatorsTotal = async () => {
  const rewards = await RewardModel.find({
    role: "validator",
  }).lean<Reward[]>();
  if (!rewards) return [];

  const rewardsMap = new Map<string, number>();
  const rewardsList = [];

  for (const reward of rewards) {
    if (
      reward.validator !== null &&
      reward.validator !== undefined &&
      reward.rewardAmount
    ) {
      const sum = rewardsMap.get(reward.validator) || 0;
      const newSum = sum + parseFloat(reward.rewardAmount);
      rewardsMap.set(reward.validator, newSum);
    }
  }

  for (const [key, value] of rewardsMap.entries()) {
    rewardsList.push({
      validator: key,
      total: value,
    });
  }
  const identityList = await Promise.all(
    rewardsList.map(async (reward) => {
      const identity = await getIdentity(reward.validator);
      return {
        ...reward,
        identity: identity,
      };
    }),
  );

  return identityList.sort((a, b) => b.total - a.total);
};

export const getRewardsAllNominatorsTotal = async () => {
  const rewards = await RewardModel.find({
    role: "nominator",
  }).lean<Reward[]>();

  if (!rewards) return [];

  const rewardsMap = new Map();
  const rewardsList = [];

  for (const reward of rewards) {
    if (reward && reward.nominator && reward.rewardAmount) {
      const sum = parseFloat(rewardsMap.get(reward.nominator)) || 0;
      const newSum = sum + parseFloat(reward.rewardAmount);
      rewardsMap.set(reward.nominator, sum + newSum);
    }
  }

  for (const [key, value] of rewardsMap.entries()) {
    rewardsList.push({
      nominator: key,
      total: value,
    });
  }
  const identityList = await Promise.all(
    rewardsList.map(async (reward) => {
      const identity = await getIdentity(reward.nominator);
      return {
        ...reward,
        identity: identity,
      };
    }),
  );

  return identityList.sort((a, b) => b.total - a.total);
};

export const getTotalNominatorRewards = async (nominator: string) => {
  const rewards = await RewardModel.find({
    nominator,
    role: "nominator",
  }).lean();
  let total = 0;
  for (const reward of rewards) {
    total += Number(reward.rewardAmount);
  }
  return {
    total: total,
    rewardCount: rewards.length,
  };
};
