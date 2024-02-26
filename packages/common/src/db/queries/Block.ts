import { BlockIndexModel } from "../models";

export const getBlockIndex = async () => {
  return await BlockIndexModel.findOne({}).exec();
};

export const setBlockIndex = async (
  earliest: number,
  latest: number,
): Promise<boolean> => {
  try {
    const existingBlockIndex = await BlockIndexModel.findOne({}).lean();
    if (
      existingBlockIndex &&
      earliest >= existingBlockIndex.earliest &&
      latest <= existingBlockIndex.latest
    ) {
      return false;
    }

    if (
      existingBlockIndex &&
      earliest <= existingBlockIndex.earliest &&
      latest > existingBlockIndex.latest
    ) {
      await BlockIndexModel.findOneAndUpdate(
        {},
        { earliest: earliest, latest: latest },
      ).exec();
      return true;
    }

    if (!existingBlockIndex) {
      const newBlockIndex = new BlockIndexModel({
        earliest: earliest,
        latest: latest,
      });
      await newBlockIndex.save();
      return true;
    }

    if (earliest < existingBlockIndex.earliest) {
      await BlockIndexModel.findOneAndUpdate(
        {},
        { earliest: earliest, latest: existingBlockIndex.latest },
      ).exec();
    }

    if (latest > existingBlockIndex.latest) {
      await BlockIndexModel.findOneAndUpdate(
        {},
        { latest: latest, earliest: existingBlockIndex.earliest },
      ).exec();
    }

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};
