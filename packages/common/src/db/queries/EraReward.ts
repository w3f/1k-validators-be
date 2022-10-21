import { EraRewardModel } from "../models";

export const setEraReward = async (
  era: number,
  stash: string,
  rewardDestination: string,
  validatorStash: string,
  amount: number,
  blockTimestamp: number,
  blockNumber: number,
  slashKTon: number,
  claimTimestampDelta: number,
  claimBlockDelta: number
): Promise<any> => {
  const data = await EraRewardModel.findOne({
    era: era,
    stash: stash,
  });

  // If the era rewards already exist and are the same as before, return
  if (!!data && data.blockTimestamp == blockTimestamp) return;

  // If an era reward record for that era doesnt yet exist create it
  if (!data) {
    const eraReward = new EraRewardModel({
      era,
      stash,
      rewardDestination,
      validatorStash,
      amount,
      blockTimestamp,
      blockNumber,
      slashKTon,
      claimTimestampDelta,
      claimBlockDelta,
      updated: Date.now(),
    });
    return eraReward.save();
  }

  // It exists, but has a different value - update it
  await EraRewardModel.findOneAndUpdate(
    {
      stash: stash,
      era: era,
    },
    {
      rewardDestination,
      validatorStash,
      amount,
      blockTimestamp,
      blockNumber,
      slashKTon,
      claimTimestampDelta,
      claimBlockDelta,
      updated: Date.now(),
    }
  ).exec();
};

// Retrieves the last era paid event record (by era)
export const getLastEraRewards = async (
  stash: string,
  limit: number
): Promise<any> => {
  return EraRewardModel.find({ stash: stash }).sort("-era").limit(limit);
};

// returns a era paid event for a given era
export const getEraReward = async (
  stash: string,
  era: number
): Promise<any> => {
  const data = await EraRewardModel.findOne({
    stash: stash,
    era: era,
  });
  return data;
};
