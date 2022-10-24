import logger from "../../logger";
import { ValidatorScoreMetadataModel } from "../models";

export const setValidatorScoreMetadata = async (
  scoreMetadata: any,
  updated: number
): Promise<boolean> => {
  logger.info(`(Db::SetScoreMetadata) Setting validator score metadata`);
  const {
    session,
    bondedStats,
    bondedWeight,
    faultsStats,
    faultsWeight,
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
    locationStats,
    locationWeight,
    regionStats,
    regionWeight,
    countryStats,
    countryWeight,
    providerStats,
    providerWeight,
    nominatorStakeStats,
    nominatorStakeWeight,
    delegationStats,
    delegationWeight,
    councilStakeStats,
    councilStakeWeight,
    democracyStats,
    democracyWeight,
  } = scoreMetadata;

  const data = await ValidatorScoreMetadataModel.findOne({
    session: session,
  }).exec();

  // If they don't exist
  if (!data) {
    logger.info(`score metadata doesn't exist... creating...`);
    const validatorScoreMetadata = new ValidatorScoreMetadataModel({
      session,
      bondedStats,
      bondedWeight,
      faultsStats,
      faultsWeight,
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
      locationStats,
      locationWeight,
      regionStats,
      regionWeight,
      countryStats,
      countryWeight,
      providerStats,
      providerWeight,
      nominatorStakeStats,
      nominatorStakeWeight,
      delegationStats,
      delegationWeight,
      councilStakeStats,
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
    { session: session },
    {
      session,
      bondedStats,
      bondedWeight,
      faultsStats,
      faultsWeight,
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
      locationStats,
      locationWeight,
      regionStats,
      regionWeight,
      countryStats,
      countryWeight,
      providerStats,
      providerWeight,
      nominatorStakeStats,
      nominatorStakeWeight,
      delegationStats,
      delegationWeight,
      councilStakeStats,
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
