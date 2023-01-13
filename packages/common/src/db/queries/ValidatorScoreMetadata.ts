import logger from "../../logger";
import { ValidatorScoreMetadataModel, ValidatorScoreModel } from "../models";

export const setValidatorScoreMetadata = async (
  scoreMetadata: any,
  updated: number
): Promise<boolean> => {
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
    openGovStats,
    openGovWeight,
    openGovDelegationStats,
    openGovDelegationWeight,
  } = scoreMetadata;

  const data = await ValidatorScoreMetadataModel.findOne({
    session: session,
  })
    .lean()
    .exec();

  // If they don't exist
  if (!data) {
    try {
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
        openGovStats,
        openGovWeight,
        openGovDelegationStats,
        openGovDelegationWeight,
        updated,
      });
      await validatorScoreMetadata.save();
      return true;
    } catch (e) {
      logger.error(JSON.stringify(e));
    }
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
      openGovStats,
      openGovWeight,
      openGovDelegationStats,
      openGovDelegationWeight,
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
