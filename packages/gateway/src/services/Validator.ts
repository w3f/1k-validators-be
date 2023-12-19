import { queries } from "@1kv/common";

export const getLatestValidatorSet = async (): Promise<any> => {
  const validators = await queries.getLatestValidatorSet();
  return validators;
};

export const getValidators = async (): Promise<any> => {
  const validators = await queries.getValidators();
  return validators;
};

export const getValidator = async (address: string): Promise<any> => {
  const validator = await queries.getValidator(address);
  return validator;
};
