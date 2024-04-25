import {
  Candidate,
  Validator,
  ValidatorModel,
  ValidatorSet,
  ValidatorSetModel,
} from "../models";
import { allCandidates, getIdentityAddresses } from "./Candidate";
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
    .lean<ValidatorSet>();
};

export const getAllValidatorSets = async (): Promise<ValidatorSet[]> => {
  return ValidatorSetModel.find({}).sort({ era: -1 }).lean<ValidatorSet[]>();
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

export const getValidator = async (
  address: string,
): Promise<Validator | null> => {
  return ValidatorModel.findOne({ address }).lean<Validator>();
};

export const getValidators = async (): Promise<Validator[]> => {
  return ValidatorModel.find({}).lean<Validator[]>();
};

interface BeefyStats {
  beefy1KVCount: number;
  activeBeefy1KVCount: number;
  activeBeefy1KVPercentage: number;
  total1KVValidatorCount: number;
  beefyTotalValidatorCount: number;
  activeBeefyValidatorCount: number;
  activeBeefyPercentage: number;
  activeValidatorCount: number;
  totalValidators: number;
  totalBeefyValidators: number;
}

export const getValidatorsBeefyStats = async (): Promise<BeefyStats> => {
  const latestValidatorSet = await getLatestValidatorSet();
  const validators: Validator[] = (await getValidators()) ?? [];
  const candidates: Candidate[] = (await allCandidates()) ?? [];

  const beefyValidators = validators.filter(
    (validator) => validator.keys?.beefy?.slice(0, 10) !== "0x62656566",
  );

  const activeBeefyValidators = beefyValidators.filter((validator) =>
    latestValidatorSet?.validators?.includes(validator.address),
  );

  const activeBeefy1KVValidators = candidates.filter((candidate) => {
    return activeBeefyValidators.some(
      (validator) => validator.address === candidate.stash,
    );
  });

  const totalBeefy1KVValidators = candidates.filter((candidate) => {
    return beefyValidators.some(
      (validator) => validator.address === candidate.stash,
    );
  });

  const activeBeefy1KVPercentage = latestValidatorSet?.validators
    ? (activeBeefy1KVValidators.length / latestValidatorSet.validators.length) *
      100
    : 0;

  const activeBeefyPercentage = latestValidatorSet?.validators
    ? (activeBeefyValidators.length / latestValidatorSet.validators.length) *
      100
    : 0;

  const totalBeefyValidators = validators?.length
    ? (beefyValidators.length / validators.length) * 100
    : 0;

  return {
    beefy1KVCount: totalBeefy1KVValidators.length,
    activeBeefy1KVCount: activeBeefy1KVValidators.length,
    activeBeefy1KVPercentage,
    total1KVValidatorCount: candidates.length,
    beefyTotalValidatorCount: beefyValidators.length,
    activeBeefyValidatorCount: activeBeefyValidators.length,
    activeBeefyPercentage,
    activeValidatorCount: latestValidatorSet?.validators?.length ?? 0,
    totalValidators: validators.length,
    totalBeefyValidators,
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
  return validator?.keys?.beefy?.slice(0, 10) == "0x62656566";
};

// TODO: add tests
// Returns the number of eras a validator stash has been active
export const getValidatorActiveEras = async (
  stash: string,
): Promise<number> => {
  let count = 0;
  const validatorSets = await getAllValidatorSets();
  for (const era of validatorSets) {
    if (era.validators.includes(stash)) {
      count++;
    }
  }
  return count;
};

// TODO: add tests
// return the number of eras
export const getIdentityValidatorActiveEras = async (
  address: string,
  validatorSets: ValidatorSet[],
): Promise<number> => {
  const identityAddresses = await getIdentityAddresses(address);
  let count = 0;
  for (const era of validatorSets) {
    if (
      era.validators.some((validator) => identityAddresses.includes(validator))
    ) {
      count++;
    }
  }
  return count;
};
