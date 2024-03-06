import { NominatorStake, NominatorStakeModel } from "../models";
import { TWO_DAYS_IN_MS } from "../../constants";
import { logger } from "../../index";
import { dbLabel } from "../index";

export const setNominatorStake = async (
  validator: string,
  era: number,
  totalStake: number,
  inactiveStake: number,
  activeNominators: Array<{ address: string; bonded: number }>,
  inactiveNominators: Array<{ address: string; bonded: number }>,
): Promise<boolean> => {
  try {
    // Try and find an existing record
    const data = await NominatorStakeModel.findOne({
      era,
      validator,
    }).lean<NominatorStake>();

    // If it already exist and are the same as before, return
    if (!!data && data.inactiveStake == inactiveStake) return false;

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
      await nominatorStake.save();
      return true;
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
      },
    ).exec();
    return true;
  } catch (e) {
    console.error(`Error setting nominator stake: ${JSON.stringify(e)}`);
    return false;
  }
};

export const getLatestNominatorStake = async (
  validator: string,
): Promise<NominatorStake | null> => {
  return (
    await NominatorStakeModel.find({ validator: validator })
      .sort({ era: -1 })
      .limit(1)
      .lean<NominatorStake[]>()
  )[0];
};

export const getEraNominatorStake = async (
  validator: string,
  era: number,
): Promise<NominatorStake | null> => {
  return NominatorStakeModel.findOne({
    validator,
    era,
  }).lean<NominatorStake>();
};

export const getNominatorStake = async (
  validator: string,
  limit?: number,
): Promise<NominatorStake[]> => {
  return NominatorStakeModel.find({ validator })
    .lean<NominatorStake[]>()
    .sort("-era")
    .limit(limit ? limit : 100);
};

export const cleanOldNominatorStakes = async (): Promise<boolean> => {
  const twoDaysAgo = Date.now() - TWO_DAYS_IN_MS;

  try {
    await NominatorStakeModel.deleteMany({
      updated: { $lt: twoDaysAgo },
    }).exec();
    return true;
  } catch (error) {
    logger.info(
      `Error cleaning old nominator stakes: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};
