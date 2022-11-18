import { LatestValidatorSetModel } from "../models";

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
