import logger from "../../logger";
import { ValidatorScoreMetadata, ValidatorScoreMetadataModel } from "../models";

export const setValidatorScoreMetadata = async (
  scoreMetadata: ValidatorScoreMetadata,
  updated: number,
): Promise<boolean> => {
  try {
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
          updated,
        });
        await validatorScoreMetadata.save();
        return true;
      } catch (e) {
        logger.error(JSON.stringify(e));
        return false;
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
        updated,
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    return false;
  }
};

export const getValidatorScoreMetadata = async (
  session: number,
): Promise<ValidatorScoreMetadata | null> => {
  return ValidatorScoreMetadataModel.findOne({
    session,
  }).lean<ValidatorScoreMetadata>();
};

export const getLatestValidatorScoreMetadata =
  async (): Promise<ValidatorScoreMetadata | null> => {
    return ValidatorScoreMetadataModel.findOne({})
      .lean<ValidatorScoreMetadata>()
      .sort("-updated");
  };
