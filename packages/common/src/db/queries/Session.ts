import { EraModel, LatestSessionModel } from "../models";

export const setLatestSession = async (index: number): Promise<boolean> => {
  const data = await LatestSessionModel.findOne({}).lean();
  if (!data) {
    const session = new LatestSessionModel({
      session: index.toString(),
      updated: Date.now(),
    });
    await session.save();
    return true;
  }

  await EraModel.findOneAndUpdate(
    {},
    {
      $set: {
        session: index.toString(),
        updated: Date.now(),
      },
    }
  ).exec();
  return true;
};

export const getLatestSession = async (): Promise<any> => {
  return LatestSessionModel.findOne({}).lean().exec();
};
