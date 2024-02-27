import {
  setValidatorScoreMetadata,
  ValidatorScoreMetadata,
  validCandidates,
} from "../db";
import {
  getBondedValues,
  getCountryValues,
  getDiscoveredAtValues,
  getFaultsValues,
  getInclusionValues,
  getLocationValues,
  getNominatedAtValues,
  getNominatorStakeValues,
  getOfflineValues,
  getProviderValues,
  getRankValues,
  getRegionValues,
  getSpanInclusionValues,
} from "./Values";
import { logger } from "../index";
import { OTV } from "./constraints";

export const setScoreMetadata = async (constraints: OTV): Promise<boolean> => {
  try {
    const session = await constraints.chaindata.getSession();
    const candidates = await validCandidates();

    if (!session || candidates.length === 0) {
      logger.error(`Error getting session or candidates.`, {
        label: "Constraints",
      });
      return false;
    }

    // Get Ranges of Parameters
    //    A validators individual parameter is then scaled to how it compares to others that are also deemed valid

    // Get Values and Stats
    const { bondedStats } = getBondedValues(candidates);
    const { faultsStats } = getFaultsValues(candidates);
    const { inclusionStats } = getInclusionValues(candidates);
    const { spanInclusionStats } = getSpanInclusionValues(candidates);
    const { discoveredAtStats } = getDiscoveredAtValues(candidates);
    const { nominatedAtStats } = getNominatedAtValues(candidates);
    const { offlineStats } = getOfflineValues(candidates);
    const { rankStats } = getRankValues(candidates);
    const { locationArr, locationStats } = await getLocationValues(candidates);
    const { regionArr, regionStats } = await getRegionValues(candidates);
    const { countryArr, countryStats } = await getCountryValues(candidates);
    const { providerArr, providerStats } = await getProviderValues(candidates);
    const { ownNominatorAddresses, nominatorStakeStats } =
      await getNominatorStakeValues(candidates);

    const scoreMetadata: ValidatorScoreMetadata = {
      session: session || 0,
      bondedStats: bondedStats,
      bondedWeight: constraints.WEIGHT_CONFIG.BONDED_WEIGHT,
      faultsStats: faultsStats,
      faultWeight: constraints.WEIGHT_CONFIG.FAULTS_WEIGHT,
      inclusionStats: inclusionStats,
      inclusionWeight: constraints.WEIGHT_CONFIG.INCLUSION_WEIGHT,
      spanInclusionStats: spanInclusionStats,
      spanInclusionWeight: constraints.WEIGHT_CONFIG.SPAN_INCLUSION_WEIGHT,
      discoveredAtStats: discoveredAtStats,
      discoveredAtWeight: constraints.WEIGHT_CONFIG.DISCOVERED_WEIGHT,
      nominatedAtStats: nominatedAtStats,
      nominatedAtWeight: constraints.WEIGHT_CONFIG.NOMINATED_WEIGHT,
      offlineStats: offlineStats,
      offlineWeight: constraints.WEIGHT_CONFIG.OFFLINE_WEIGHT,
      rankStats: rankStats,
      rankWeight: constraints.WEIGHT_CONFIG.RANK_WEIGHT,
      locationStats: locationStats,
      locationWeight: constraints.WEIGHT_CONFIG.LOCATION_WEIGHT,
      regionStats: regionStats,
      regionWeight: constraints.WEIGHT_CONFIG.REGION_WEIGHT,
      countryStats: countryStats,
      countryWeight: constraints.WEIGHT_CONFIG.COUNTRY_WEIGHT,
      providerStats: providerStats,
      providerWeight: constraints.WEIGHT_CONFIG.PROVIDER_WEIGHT,
      nominatorStakeStats: nominatorStakeStats,
      nominatorStakeWeight: constraints.WEIGHT_CONFIG.NOMINATIONS_WEIGHT,
      rpcWeight: constraints.WEIGHT_CONFIG.RPC_WEIGHT,
      clientWeight: constraints.WEIGHT_CONFIG.CLIENT_WEIGHT,
    };

    // Create  entry for Validator Score Metadata
    await setValidatorScoreMetadata(scoreMetadata, Date.now());

    logger.info(`validator score metadata set.`, {
      label: "Constraints",
    });
    return true;
  } catch (error) {
    logger.error(`Error setting validator score metadata: ${error}`, {
      label: "Constraints",
    });
    return false;
  }
};
