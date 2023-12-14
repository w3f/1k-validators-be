import { LatestValidatorSetModel, ValidatorModel } from "../models";

export const setLatestValidatorSet = async (
  session: number,
  era: number,
  validators: string[]
): Promise<boolean> => {
  const data = await LatestValidatorSetModel.findOne({}).lean();
  if (!data) {
    const latestValidatorSet = new LatestValidatorSetModel({
      session: session,
      era: era,
      validators: validators,
      updated: Date.now(),
    });
    await latestValidatorSet.save();
    return true;
  }

  await LatestValidatorSetModel.findOneAndUpdate(
    {},
    {
      $set: {
        session: session,
        era: era,
        validators: validators,
        updated: Date.now(),
      },
    }
  ).exec();
  return true;
};

export const getLatestValidatorSet = async (): Promise<any> => {
  return LatestValidatorSetModel.findOne({}).lean().exec();
};

export const setValidatorKeys = async (
  address: string,
  keys: {
    grandpa: string;
    babe: string;
    imOnline: string;
    paraValidator: string;
    paraAssingnment: string;
    authorityDiscovery: string;
    beefy: string;
  }
): Promise<boolean> => {
  const data = await ValidatorModel.findOne({ address }).lean();
  if (!data) {
    const validator = new ValidatorModel({
      address: address,
      keys: keys,
    });
    await validator.save();
    return true;
  }

  await ValidatorModel.findOneAndUpdate(
    { address },
    {
      keys: keys,
    }
  ).exec();
  return true;
};

export const getValidator = async (address: string): Promise<any> => {
  return ValidatorModel.find({ address }).lean().exec();
};

export const getValidators = async (): Promise<any> => {
  return ValidatorModel.find({}).lean().exec();
};
