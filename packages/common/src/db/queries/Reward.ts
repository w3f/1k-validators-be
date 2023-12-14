import { PayoutTransactionModel, RewardModel } from "../models";
import { getIdentity } from "./Candidate";

export const setPayoutTransaction = async (
  validator: string,
  era: number,
  submitter: string,
  blockHash: string,
  blockNumber: number,
  timestamp: number
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
      }
    ).exec();
    return true;
  }
};

export const getPayoutTransaction = async (
  validator: string,
  era: number
): Promise<any> => {
  return PayoutTransactionModel.findOne(
    { validator, era },
    { _id: 0, __v: 0 }
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
  rewardAmount: string,
  rewardDestination: string,
  validatorStakeEfficiency: number,
  erasMinStake: number,
  blockHash: string,
  blockNumber: number,
  timestamp: number,
  date: string,
  chf: number,
  usd: number,
  eur: number
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
    }
  ).exec();
};

export const getReward = async (
  validator: string,
  nominator: string,
  era: number
): Promise<any> => {
  return RewardModel.findOne(
    { validator, nominator, era },
    { _id: 0, __v: 0 }
  ).lean();
};

export const getRewards = async (
  validator: string,
  era: number
): Promise<any> => {
  return RewardModel.find({ validator, era }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByEra = async (era: number): Promise<any> => {
  return RewardModel.find({ era }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByValidator = async (
  validator: string
): Promise<any> => {
  return RewardModel.find({ validator }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByNominator = async (
  nominator: string
): Promise<any> => {
  return RewardModel.find({ nominator }, { _id: 0, __v: 0 }).lean();
};

export const getRewardsByEraAndNominator = async (
  era: number,
  nominator: string
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
  }).lean();

  const rewardsMap = new Map();
  const rewardsList = [];

  for (const reward of rewards) {
    // logger.info(reward.validator);
    // logger.info(reward.rewardAmount);
    const numRewards =
      parseFloat(rewardsMap.get(reward.validator)?.numRewards) || 0;
    const totalRewardsSum =
      parseFloat(rewardsMap.get(reward.validator)?.totalRewards) || 0;
    const efficiencySum =
      parseFloat(rewardsMap.get(reward.validator)?.efficiency) || 0;
    const stakeSum = parseFloat(rewardsMap.get(reward.validator)?.stake) || 0;
    const minStake =
      parseFloat(rewardsMap.get(reward.validator)?.minStake) || 0;
    const commission =
      parseFloat(rewardsMap.get(reward.validator)?.commission) || 0;
    rewardsMap.set(reward.validator, {
      numRewards: numRewards + 1,
      totalRewards: totalRewardsSum + parseFloat(reward.rewardAmount),
      efficiency: efficiencySum + reward.validatorStakeEfficiency,
      stake: stakeSum + reward.totalStake,
      minStake: minStake + reward.erasMinStake,
      commission: commission + reward.commission,
    });
  }

  for (const [key, value] of rewardsMap.entries()) {
    rewardsList.push({
      validator: key,
      numRewards: value.numRewards,
      totalRewards: value.totalRewards,
      avgEfficiency: value.efficiency / value.numRewards,
      avgStake: value.stake / value.numRewards,
      avgEraMinStake: value.minStake / value.numRewards,
      avgCommission: value.commission / value.numRewards,
    });
  }
  const identityList = await Promise.all(
    rewardsList.map(async (reward) => {
      const identity = await getIdentity(reward.validator);
      return {
        ...reward,
        identity: identity,
      };
    })
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
  }).lean();

  const rewardsMap = new Map();
  const rewardsList = [];

  for (const reward of rewards) {
    // logger.info(reward.validator);
    // logger.info(reward.rewardAmount);
    const sum = parseFloat(rewardsMap.get(reward.validator)) || 0;
    rewardsMap.set(reward.validator, sum + parseFloat(reward.rewardAmount));
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
    })
  );

  return identityList.sort((a, b) => b.total - a.total);
};

export const getRewardsAllNominatorsTotal = async () => {
  const rewards = await RewardModel.find({
    role: "nominator",
  }).lean();

  const rewardsMap = new Map();
  const rewardsList = [];

  for (const reward of rewards) {
    const sum = parseFloat(rewardsMap.get(reward.nominator)) || 0;
    rewardsMap.set(reward.nominator, sum + parseFloat(reward.rewardAmount));
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
    })
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
