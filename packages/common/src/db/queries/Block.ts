import { BlockIndexModel } from "../models";

export const getBlockIndex = async () => {
  return await BlockIndexModel.findOne({}).exec();
};

export const setBlockIndex = async (
  earliest: number,
  latest: number,
): Promise<any> => {
  const exists = await BlockIndexModel.findOne({}).exec();
  if (!exists) {
    const data = await new BlockIndexModel({
      earliest: earliest,
      latest: latest,
    });
    return data.save();
  }
  if (earliest < exists.earliest) {
    await BlockIndexModel.findOneAndUpdate({}, { earliest: earliest }).exec();
  }
  if (latest > exists.latest) {
    await BlockIndexModel.findOneAndUpdate({}, { latest: latest }).exec();
  }
};
