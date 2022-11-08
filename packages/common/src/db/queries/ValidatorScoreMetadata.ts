import logger from "../../logger";
import { ValidatorScoreMetadataModel, ValidatorScoreModel } from "../models";

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
  })
    .lean()
    .exec();

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

export const getValidatorScoreMetadata = async (session): Promise<any> => {
  return ValidatorScoreMetadataModel.findOne({ session }).lean();
};

export const getLatestValidatorScoreMetadata = async (): Promise<any> => {
  return (
    await ValidatorScoreMetadataModel.find({}).lean().sort("-updated").limit(1)
  )[0];
};
