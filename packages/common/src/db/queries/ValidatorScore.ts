import { LocationStatsModel, ValidatorScoreModel } from "../models";

export const setValidatorScore = async (
  address: string,
  session: number,
  updated: number,
  total: number,
  aggregate: number,
  inclusion: number,
  spanInclusion: number,
  discovered: number,
  nominated: number,
  rank: number,
  unclaimed: number,
  bonded: number,
  faults: number,
  offline: number,
  location: number,
  region: number,
  country: number,
  provider: number,
  councilStake: number,
  democracy: number,
  nominatorStake: number,
  delegations: number,
  randomness: number
): Promise<boolean> => {
  // logger.info(
  // `(Db::setNomination) Setting validator score for ${address} with total: ${total}`
  // );

  const data = await ValidatorScoreModel.findOne({
    address: address,
    session: session,
  });

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
  });
};

export const getLatestValidatorScore = async (
  address: string
): Promise<any> => {
  return (
    await ValidatorScoreModel.find({ address: address })
      .sort("-updated")
      .limit(1)
  )[0];
};
