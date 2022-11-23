import { queries } from "@1kv/common";

export const getLatestValidatorSet = async (): Promise<any> => {
  const validators = await queries.getLatestValidatorSet();
  return validators;
};
