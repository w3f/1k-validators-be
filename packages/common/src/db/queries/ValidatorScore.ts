import { ValidatorScoreModel } from "../models";

export const setValidatorScore = async (
  address: string,
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
  });

  if (!data) {
    const score = new ValidatorScoreModel({
      address,
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

export const getValidatorScore = async (address: string): Promise<any> => {
  return ValidatorScoreModel.findOne({
    address: address,
  });
};
