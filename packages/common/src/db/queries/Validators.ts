import { LatestValidatorSetModel, ValidatorModel } from "../models";
import { allCandidates } from "./Candidate";

export const setLatestValidatorSet = async (
  session: number,
  era: number,
  validators: string[],
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
    },
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
  },
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
