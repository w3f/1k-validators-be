import { ValidatorScoreModel } from "../models";
import { logger } from "../../index";

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
    openGovDelegations,
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
      openGovDelegations,
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
      openGovDelegations,
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

export const deleteOldValidatorScores = async (): Promise<any> => {
  logger.info(`removing old validator scores...`);
  const FIVE_MINUTES = 300000;
  const ONE_WEEK = 604800016.56;
  const ONE_MONTH = 2629800000;
  const timeWindow = Date.now() - ONE_MONTH;
  const scoreToDelete = await ValidatorScoreModel.find({
    updated: { $lt: timeWindow },
  })
    .remove()
    .exec();
};
