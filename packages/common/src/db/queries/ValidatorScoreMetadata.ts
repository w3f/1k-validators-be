import logger from "../../logger";
import { ValidatorScoreMetadataModel } from "../models";

export const setValidatorScoreMetadata = async (
  bondedStats: any,
  bondedWeight: number,
  faultsStats: any,
  faultWeight: number,
  inclusionStats: any,
  inclusionWeight: number,
  spanInclusionStats: any,
  spanInclusionWeight: number,
  discoveredAtStats: any,
  discoveredAtWeight: number,
  nominatedAtStats: any,
  nominatedAtWeight: number,
  offlineStats: any,
  offlineWeight: number,
  rankStats: any,
  rankWeight: number,
  unclaimedStats: any,
  unclaimedWeight: number,
  locationStats: any,
  locationWeight: number,
  councilStakeStats: any,
  councilStakeWeight: number,
  democracyStats: any,
  democracyWeight: number,
  updated: number
): Promise<boolean> => {
  logger.info(`(Db::SetScoreMetadata) Setting validator score metadata`);
  const data = await ValidatorScoreMetadataModel.findOne({
    updated: { $gte: 0 },
  }).exec();

  // If they don't exist
  if (!data) {
    logger.info(`score metadata doesn't exist... creating...`);
    const validatorScoreMetadata = new ValidatorScoreMetadataModel({
      bondedStats,
      bondedWeight,
      faultsStats,
      faultWeight,
      inclusionStats,
      inclusionWeight,
      spanInclusionStats,
      spanInclusionWeight,
      discoveredAtStats,
      discoveredAtWeight,
      nominatedAtStats,
      nominatedAtWeight,
      offlineStats,
      offlineWeight,
      rankStats,
      rankWeight,
      unclaimedStats,
      unclaimedWeight,
      locationStats,
      locationWeight,
      // councilStakeStats,
      councilStakeWeight,
      democracyStats,
      democracyWeight,
      updated,
    });
    await validatorScoreMetadata.save();
    return true;
  }

  // It exists, but has a different value - update it
  await ValidatorScoreMetadataModel.findOneAndUpdate(
    { updated: { $gte: 0 } },
    {
      bondedStats,
      bondedWeight,
      faultsStats,
      faultWeight,
      inclusionStats,
      inclusionWeight,
      spanInclusionStats,
      spanInclusionWeight,
      discoveredAtStats,
      discoveredAtWeight,
      nominatedAtStats,
      nominatedAtWeight,
      offlineStats,
      offlineWeight,
      rankStats,
      rankWeight,
      unclaimedStats,
      unclaimedWeight,
      locationStats,
      locationWeight,
      // councilStakeStats,
      councilStakeWeight,
      democracyStats,
      democracyWeight,
      updated,
    }
  ).exec();
};

export const getValidatorScoreMetadata = async (): Promise<any> => {
  return await ValidatorScoreMetadataModel.findOne({
    updated: { $gte: 0 },
  }).exec();
};
