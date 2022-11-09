import { NominatorStakeModel } from "../models";

export const setNominatorStake = async (
  validator: string,
  era: number,
  totalStake: number,
  inactiveStake: number,
  activeNominators: Array<{ address: string; bonded: number }>,
  inactiveNominators: Array<{ address: string; bonded: number }>
): Promise<any> => {
  // Try and find an existing record
  const data = await NominatorStakeModel.findOne({
    era,
    validator,
  }).lean();

  // If it already exist and are the same as before, return
  if (!!data && data.inactiveStake == inactiveStake) return;

  // If it doesnt yet exist
  if (!data) {
    const nominatorStake = new NominatorStakeModel({
      validator,
      era,
      totalStake,
      inactiveStake,
      activeNominators,
      inactiveNominators,
      updated: Date.now(),
    });
    return nominatorStake.save();
  }

  // It exists, but has a different value - update it
  await NominatorStakeModel.findOneAndUpdate(
    {
      validator,
      era,
    },
    {
      totalStake,
      inactiveStake,
      activeNominators,
      inactiveNominators,
      updated: Date.now(),
    }
  ).exec();
};

export const getLatestNominatorStake = async (
  validator: string
): Promise<any> => {
  return (
    await NominatorStakeModel.find({ validator })
      .hint({ validator: 1 })
      .sort({ era: -1 })
      .limit(1)
      .lean()
  )[0];
};

export const getEraNominatorStake = async (
  validator: string,
  era: number
): Promise<any> => {
  return (await NominatorStakeModel.find({ validator, era }).lean())[0];
};

export const getNominatorStake = async (
  validator: string,
  limit?: number
): Promise<any> => {
  await NominatorStakeModel.find({ validator })
    .lean()
    .sort("-era")
    .limit(limit ? limit : 100)[0];
};
