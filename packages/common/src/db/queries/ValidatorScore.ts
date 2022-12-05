import { ValidatorScoreModel } from "../models";
import logger from "../../logger";

export const setValidatorScore = async (
  address: string,
  session: number,
  score: any
): Promise<boolean> => {
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
    councilStake,
    democracy,
    nominatorStake,
    delegations,
    openGov,
    randomness,
    updated,
  } = score;

  const data = await ValidatorScoreModel.findOne({
    address: address,
    session: session,
  }).lean();

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
      councilStake,
      democracy,
      nominatorStake,
      delegations,
      openGov,
      randomness,
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
      councilStake,
      democracy,
      nominatorStake,
      delegations,
      openGov,
      randomness,
    }
  ).exec();
};

export const getValidatorScore = async (
  address: string,
  session: number
): Promise<any> => {
  return ValidatorScoreModel.findOne({
    address: address,
    session: session,
  }).lean();
};

export const getLatestValidatorScore = async (
  address: string
): Promise<any> => {
  return (
    await ValidatorScoreModel.find({ address: address })
      .sort({ session: -1 })
      .limit(1)
      .lean()
  )[0];
};
