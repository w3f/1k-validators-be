import { ValidatorScore, ValidatorScoreModel } from "../models";
import { TWO_DAYS_IN_MS } from "../../constants";

export const setValidatorScore = async (
  address: string,
  session: number,
  score: any,
): Promise<boolean> => {
  try {
    const {
      total,
      aggregate,
      inclusion,
      spanInclusion,
      discovered,
      nominated,
      rank,
      unclaimed,
      bonded,
      faults,
      offline,
      location,
      region,
      country,
      provider,
      nominatorStake,
      randomness,
      updated,
      client,
    } = score;

    const data = await ValidatorScoreModel.findOne({
      address: address,
      session: session,
    }).lean<ValidatorScore>();

    if (!data) {
      const score = new ValidatorScoreModel({
        address,
        session,
        updated,
        total,
        aggregate,
        inclusion,
        spanInclusion,
        discovered,
        nominated,
        rank,
        unclaimed,
        bonded,
        faults,
        offline,
        location,
        region,
        country,
        provider,
        nominatorStake,
        randomness,
        client,
      });
      await score.save();
      return true;
    }

    await ValidatorScoreModel.findOneAndUpdate(
      {
        address: address,
        session: session,
      },
      {
        updated,
        total,
        aggregate,
        inclusion,
        spanInclusion,
        discovered,
        nominated,
        rank,
        unclaimed,
        bonded,
        faults,
        offline,
        location,
        region,
        country,
        provider,
        nominatorStake,
        client,
        randomness,
      },
    ).exec();
    return true;
  } catch (e) {
    console.error(`Error setting validator score: ${JSON.stringify(e)}`);
    return false;
  }
};

export const getValidatorScore = async (
  address: string,
  session: number,
): Promise<any> => {
  return ValidatorScoreModel.findOne(
    {
      address: address,
      session: session,
    },
    { _id: 0, __v: 0 },
  ).lean<ValidatorScore>();
};

export const getLatestValidatorScore = async (
  address: string,
): Promise<ValidatorScore | null> => {
  return ValidatorScoreModel.findOne({ address: address }, { _id: 0, __v: 0 })
    .sort({ session: -1 })
    .limit(1)
    .lean<ValidatorScore>();
};

export const deleteOldValidatorScores = async (): Promise<any> => {
  const timeWindow = Date.now() - TWO_DAYS_IN_MS;
  const scoreToDelete = await ValidatorScoreModel.find({
    updated: { $lt: timeWindow },
  }).exec();
  for (const score of scoreToDelete) {
    await score.deleteOne();
  }
};
