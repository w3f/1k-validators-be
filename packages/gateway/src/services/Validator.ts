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

export const getBeefyStats = async (): Promise<any> => {
  const validators = await queries.getValidatorsBeefyStats();
  return validators;
};

export const getBeefyDummy = async (): Promise<any> => {
  const validators = await queries.getValidatorsBeefyDummy();
  return validators;
};

export const getValidatorsNumActiveEras = async (
  stash: string,
): Promise<any> => {
  const eras = await queries.getValidatorActiveEras(stash);
  return eras;
};

export const getIdentityValidatorNumActiveEras = async (
  stash: string,
): Promise<any> => {
  const eras = await queries.getIdentityValidatorActiveEras(stash);
  return eras;
};
