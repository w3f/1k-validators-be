import { EraModel } from "../models";

export const setLastNominatedEraIndex = async (
  index: number
): Promise<boolean> => {
  const data = await EraModel.findOne({ lastNominatedEraIndex: /.*/ });
  if (!data) {
    const eraIndex = new EraModel({
      lastNominatedEraIndex: index.toString(),
      when: Date.now(),
    });
    await eraIndex.save();
    return true;
  }

  await EraModel.findOneAndUpdate(
    { lastNominatedEraIndex: /.*/ },
    {
      $set: {
        lastNominatedEraIndex: index.toString(),
        when: Date.now(),
        nextNomination: Date.now() + 86400000,
      },
    }
  ).exec();
  return true;
};

export const getLastNominatedEraIndex = async (): Promise<any> => {
  return EraModel.findOne({ lastNominatedEraIndex: /[0-9]+/ }).exec();
};
