import { EraStatsModel } from "../models";
import logger from "../../logger";
import { dbLabel } from "../index";

export const setEraStats = async (
  era: number,
  totalNodes: number,
  valid: number,
  active: number,
  kyc: number,
): Promise<boolean> => {
  try {
    const data = await EraStatsModel.findOne({
      era: era,
    }).lean();

    // If the era stats already exist and are the same as before, return
    if (
      !!data &&
      data.totalNodes == totalNodes &&
      data.valid == valid &&
      data.active == active
    )
      return false;

    // If they don't exist
    if (!data) {
      const eraStats = new EraStatsModel({
        era: era,
        when: Date.now(),
        totalNodes: totalNodes,
        valid: valid,
        active: active,
        kyc: kyc,
      });
      await eraStats.save();
      return true;
    }

    // It exists, but has a different value - update it
    await EraStatsModel.findOneAndUpdate(
      {
        era: era,
      },
      {
        when: Date.now(),
        totalNodes: totalNodes,
        valid: valid,
        active: active,
        kyc: kyc,
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(`Error setting era stats: ${JSON.stringify(e)}`, dbLabel);
    return false;
  }
};

export const getLatestEraStats = async (): Promise<any> => {
  return EraStatsModel.find({}).lean().sort("-era").limit(1);
};
