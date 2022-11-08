import { EraStatsModel } from "../models";

export const setEraStats = async (
  era: number,
  totalNodes: number,
  valid: number,
  active: number
): Promise<boolean> => {
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
    return;

  // If they don't exist
  if (!data) {
    const eraStats = new EraStatsModel({
      era: era,
      when: Date.now(),
      totalNodes: totalNodes,
      valid: valid,
      active: active,
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
    }
  ).exec();
};

export const getLatestEraStats = async (): Promise<any> => {
  return EraStatsModel.find({}).lean().sort("-era").limit(1);
};
