import logger from "../../logger";
import { ReleaseModel, ReleaseSchema } from "../models";

export const setRelease = async (
  name: string,
  publishedAt: number,
): Promise<any> => {
  logger.debug(`{DB::Release} setting release for ${name}`);
  let data = await ReleaseModel.findOne({ name: name }).exec();

  if (!data) {
    data = new ReleaseModel({ name: name, publishedAt: publishedAt });
    return data.save();
  }

  return data;
};

export const getLatestRelease = async (): Promise<ReleaseSchema | null> => {
  try {
    const latestRelease = await ReleaseModel.findOne({})
      .sort("-publishedAt")
      .lean<ReleaseSchema>()
      .limit(1);
    return latestRelease;
  } catch (error) {
    console.error("Error while fetching latest release:", error);
    throw error;
  }
};
