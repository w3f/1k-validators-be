import { ValidatorModel, ValidatorSet, ValidatorSetModel } from "../models";
import { allCandidates } from "./Candidate";
import { NextKeys } from "../../chaindata/queries/ValidatorPref";

export const setValidatorSet = async (
  session: number,
  era: number,
  validators: string[],
): Promise<boolean> => {
  const exists = await validatorSetExistsForEra(era);
  if (!exists) {
    const validatorSet = new ValidatorSetModel({
      session,
      era,
      validators,
      updated: Date.now(),
    });
    await validatorSet.save();
    return true;
  } else {
    await ValidatorSetModel.findOneAndUpdate(
      { era },
      {
        session,
        era,
        validators,
        updated: Date.now(),
      },
    ).exec();
  }
  return true;
};

export const getLatestValidatorSet = async (): Promise<ValidatorSet | null> => {
  return ValidatorSetModel.findOne({})
    .sort({ session: -1 })
    .lean<ValidatorSet>()
    .exec();
};

export const getAllValidatorSets = async (): Promise<ValidatorSet[]> => {
  return ValidatorSetModel.find({})
    .sort({ era: -1 })
    .lean<ValidatorSet[]>()
    .exec();
};

export const validatorSetExistsForEra = async (
  era: number,
): Promise<boolean> => {
  const exists = await ValidatorSetModel.exists({ era });
  return !!exists;
};

export const setValidatorKeys = async (
  address: string,
  nextKeys: NextKeys,
): Promise<boolean> => {
  const { keys } = nextKeys;

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
    },
  ).exec();
  return true;
};

export const getValidator = async (address: string): Promise<any> => {
  return ValidatorModel.find({ address }).lean().exec();
};

export const getValidators = async (): Promise<any> => {
  return ValidatorModel.find({}).lean().exec();
};

export const getValidatorsBeefyStats = async (): Promise<any> => {
  const latestValidatorSet = await getLatestValidatorSet();
  const validators = await getValidators();
  const beefyValidators = validators.filter((validator: any) => {
    return validator?.keys?.beefy?.slice(0, 10) != "0x62656566";
  });

  const activeBeefyValidators = beefyValidators.filter((validator: any) => {
    return latestValidatorSet?.validators?.includes(validator.address);
  });

  const candidates = await allCandidates();
  const activeBeefy1KVValidators = candidates.filter((candidate: any) => {
    for (const validator of activeBeefyValidators) {
      if (validator.address == candidate.stash) {
        return true;
      }
    }
  });

  const totalBeefy1KVValidators = candidates.filter((candidate: any) => {
    for (const validator of beefyValidators) {
      if (validator.address == candidate.stash) {
        return true;
      }
    }
  });

  return {
    beefy1KVCount: totalBeefy1KVValidators.length,
    activeBeefy1KVCount: activeBeefy1KVValidators.length,
    activeBeefy1KVPercentage:
      (activeBeefy1KVValidators.length / latestValidatorSet.validators.length) *
      100,
    total1KVValidatorCount: candidates.length,
    beefyTotalValidatorCount: beefyValidators.length,
    activeBeefyValidatorCount: activeBeefyValidators.length,
    activeBeefyPercentage:
      (activeBeefyValidators.length / latestValidatorSet.validators.length) *
      100,
    activeValidatorCount: latestValidatorSet.validators.length,
    totalValidators: validators.length,
    totalBeefyValidators: (beefyValidators.length / validators.length) * 100,
  };
};

export const getValidatorsBeefyDummy = async (): Promise<any> => {
  const validators = await getValidators();
  const beefyValidators = validators.filter((validator: any) => {
    return validator?.keys?.beefy?.slice(0, 10) == "0x62656566";
  });
  return beefyValidators;
};

export const hasBeefyDummy = async (address: string): Promise<boolean> => {
  const validator = await getValidator(address);
  if (validator.length == 0) {
    return false;
  }
  return validator[0]?.keys?.beefy?.slice(0, 10) == "0x62656566";
};
