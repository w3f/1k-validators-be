import logger from "../../logger";
import { ReleaseModel } from "../models";

export const setRelease = async (
  name: string,
  publishedAt: number
): Promise<any> => {
  logger.debug(`{DB::Release} setting release for ${name}`);
  let data = await ReleaseModel.findOne({ name: name }).exec();

  if (!data) {
    data = new ReleaseModel({ name: name, publishedAt: publishedAt });
    return data.save();
  }

  return data;
};

export const getLatestRelease = async (): Promise<any> => {
  return (await ReleaseModel.find({}).sort("-publishedAt").limit(1))[0];
};
