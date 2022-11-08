import { DelegationModel } from "../models";

export const setDelegation = async (
  validator: string,
  totalBalance: number,
  delegators: Array<{
    address: string;
    balance: number;
    effectiveBalance: number;
    conviction: string;
  }>
): Promise<any> => {
  // Try and find an existing record
  const data = await DelegationModel.findOne({
    validator,
  }).lean();

  // If it already exist and are the same as before, return
  if (!!data && data.totalBalance == totalBalance) return;

  // If it doesnt yet exist
  if (!data) {
    const delegation = new DelegationModel({
      validator,
      totalBalance,
      delegators,
      updated: Date.now(),
    });
    return delegation.save();
  }

  // It exists, but has a different value - update it
  await DelegationModel.findOneAndUpdate(
    {
      validator,
    },
    {
      totalBalance,
      delegators,
      updated: Date.now(),
    }
  ).exec();
};

export const getDelegations = async (validator: string): Promise<any> => {
  return (await DelegationModel.find({ validator }).lean().limit(1))[0];
};

export const getAllDelegations = async (): Promise<any> => {
  return DelegationModel.find({}).sort("-totalBalance").lean();
};
