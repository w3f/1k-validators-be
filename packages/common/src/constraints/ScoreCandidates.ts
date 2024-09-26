import { scaled, scaledDefined } from "./score";
import { logger, queries } from "../index";
import {
  allNominators,
  Candidate,
  getLatestNominatorStake,
  getLatestValidatorScoreMetadata,
  setValidatorScore,
  ValidatorScoreMetadata,
  validCandidates,
} from "../db";
import { constraintsLabel, OTV } from "./constraints";
import { percentage, timeRemaining } from "../utils/util";
import { NoLocation } from "../types";

export const scoreCandidate = async (
  constraints: OTV,
  candidate: Candidate,
  scoreMetadata: ValidatorScoreMetadata,
): Promise<number | null> => {
  try {
    const {
      session,
      bondedStats,
      faultsStats,
      inclusionStats,
      spanInclusionStats,
      nominatedAtStats,
      offlineStats,
      discoveredAtStats,
      rankStats,
      locationStats,
      regionStats,
      countryStats,
      providerStats,
      nominatorStakeStats,
    } = scoreMetadata;

    // Scale inclusion between the 20th and 75th percentiles
    const scaledInclusion =
      scaledDefined(candidate.inclusion, inclusionStats.values, 0.05, 0.95) ||
      0;
    const inclusionScore =
      (1 - scaledInclusion) * constraints.WEIGHT_CONFIG.INCLUSION_WEIGHT;

    // Scale inclusion between the 20th and 75h percentiles
    const scaledSpanInclusion =
      scaledDefined(
        candidate.spanInclusion,
        spanInclusionStats.values,
        0.05,
        0.95,
      ) || 0;
    const spanInclusionScore =
      (1 - scaledSpanInclusion) *
      constraints.WEIGHT_CONFIG.SPAN_INCLUSION_WEIGHT;

    const scaledDiscovered =
      scaled(candidate.discoveredAt, discoveredAtStats.values) || 0;
    const discoveredScore =
      (1 - scaledDiscovered) * constraints.WEIGHT_CONFIG.DISCOVERED_WEIGHT;

    const scaledNominated =
      scaled(candidate.nominatedAt, nominatedAtStats.values) || 0;
    const nominatedScore =
      (1 - scaledNominated) * constraints.WEIGHT_CONFIG.NOMINATED_WEIGHT;

    const scaledRank = scaled(candidate.rank, rankStats.values) || 0;
    const rankScore = scaledRank * constraints.WEIGHT_CONFIG.RANK_WEIGHT;

    // Subtract the UNCLAIMED WEIGHT for each unclaimed era
    const unclaimedScore = candidate.unclaimedEras
      ? -1 *
        candidate.unclaimedEras.length *
        constraints.WEIGHT_CONFIG.UNCLAIMED_WEIGHT
      : 0;

    // Scale bonding based on the 5th and 85th percentile
    const scaleBonded =
      scaledDefined(
        candidate.bonded ? candidate.bonded : 0,
        bondedStats.values,
        0.05,
        0.85,
      ) || 0;
    const bondedScore = scaleBonded * constraints.WEIGHT_CONFIG.BONDED_WEIGHT;

    const scaledOffline =
      scaled(candidate.offlineAccumulated, offlineStats.values) || 0;
    const offlineScore =
      (1 - scaledOffline) * constraints.WEIGHT_CONFIG.OFFLINE_WEIGHT;

    const scaledFaults = scaled(candidate.faults, faultsStats.values) || 0;
    const faultsScore =
      (1 - scaledFaults) * constraints.WEIGHT_CONFIG.FAULTS_WEIGHT;

    const latestCandidateLocation = await queries.getCandidateLocation(
      candidate.slotId,
    );

    const provider = latestCandidateLocation?.provider || "No Provider";
    const bannedProviders = constraints.config.telemetry?.blacklistedProviders;
    let bannedProvider = false;
    if (provider && bannedProviders?.includes(provider)) {
      bannedProvider = true;
    }
    // Get the total number of nodes for the location a candidate has their node in
    const candidateLocation = locationStats.values.filter((location) => {
      if (latestCandidateLocation?.city == location.name)
        return location.numberOfNodes;
    })[0]?.numberOfNodes;
    const locationValues = locationStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the location value to between the 10th and 95th percentile
    const scaledLocation =
      scaledDefined(candidateLocation, locationValues, 0, 1) || 0;
    const locationScore = bannedProvider
      ? 0
      : latestCandidateLocation?.city == NoLocation.NoLocation ||
          !latestCandidateLocation ||
          !latestCandidateLocation?.city
        ? 0.25 * constraints.WEIGHT_CONFIG.LOCATION_WEIGHT
        : (1 - scaledLocation) * constraints.WEIGHT_CONFIG.LOCATION_WEIGHT || 0;

    const candidateRegion = regionStats.values.filter((region) => {
      if (
        latestCandidateLocation &&
        latestCandidateLocation?.region == region.name
      )
        return region.numberOfNodes;
    })[0]?.numberOfNodes;
    const regionValues = regionStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledRegion =
      scaledDefined(candidateRegion, regionValues, 0, 1) || 0;
    const regionScore = bannedProvider
      ? 0
      : latestCandidateLocation?.region == NoLocation.NoLocation ||
          !latestCandidateLocation ||
          !latestCandidateLocation?.region
        ? 0.25 * constraints.WEIGHT_CONFIG.REGION_WEIGHT
        : (1 - scaledRegion) * constraints.WEIGHT_CONFIG.REGION_WEIGHT || 0;

    const candidateCountry = countryStats.values.filter((country) => {
      if (
        latestCandidateLocation &&
        latestCandidateLocation?.country == country.name
      )
        return country.numberOfNodes;
    })[0]?.numberOfNodes;
    const countryValues = countryStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledCountry =
      scaledDefined(candidateCountry, countryValues, 0, 1) || 0;
    const countryScore = bannedProvider
      ? 0
      : latestCandidateLocation?.country == NoLocation.NoLocation ||
          !latestCandidateLocation ||
          !latestCandidateLocation?.country
        ? 0.25 * constraints.WEIGHT_CONFIG.COUNTRY_WEIGHT
        : (1 - scaledCountry) * constraints.WEIGHT_CONFIG.COUNTRY_WEIGHT || 0;

    const candidateProvider = providerStats.values.filter((provider) => {
      if (
        latestCandidateLocation &&
        latestCandidateLocation?.provider == provider.name
      )
        return provider.numberOfNodes;
    })[0]?.numberOfNodes;
    const providerValues = providerStats.values.map((location) => {
      return location.numberOfNodes;
    });
    // Scale the value to between the 10th and 95th percentile
    const scaledProvider =
      scaledDefined(candidateProvider, providerValues, 0, 1) || 0;
    const providerScore = bannedProvider
      ? 0
      : latestCandidateLocation?.provider == "No Location" ||
          !latestCandidateLocation ||
          !latestCandidateLocation?.provider
        ? 0.25 * constraints.WEIGHT_CONFIG.PROVIDER_WEIGHT
        : (1 - scaledProvider) * constraints.WEIGHT_CONFIG.PROVIDER_WEIGHT || 0;

    const nomStake = await getLatestNominatorStake(candidate.stash);
    let totalNominatorStake = 0;
    if (
      nomStake != undefined &&
      nomStake?.activeNominators &&
      nomStake?.inactiveNominators
    ) {
      const { activeNominators, inactiveNominators } = nomStake;
      const ownNominatorAddresses = (await allNominators()).map((nom) => {
        return nom?.address;
      });

      for (const active of activeNominators) {
        if (!ownNominatorAddresses.includes(active.address)) {
          totalNominatorStake += Math.sqrt(active.bonded);
        }
      }
      for (const inactive of inactiveNominators) {
        if (!ownNominatorAddresses.includes(inactive.address)) {
          totalNominatorStake += Math.sqrt(inactive.bonded);
        }
      }
    }
    const scaledNominatorStake =
      scaledDefined(
        totalNominatorStake,
        nominatorStakeStats?.values || [],
        0.05,
        0.95,
      ) || 0;
    const nominatorStakeScore =
      scaledNominatorStake * constraints.WEIGHT_CONFIG.NOMINATIONS_WEIGHT;

    const isAlternativeClient = candidate?.implementation
      ? candidate?.implementation != "Parity Polkadot"
      : false;
    const clientScore = isAlternativeClient
      ? constraints.WEIGHT_CONFIG.CLIENT_WEIGHT
      : 0;

    const aggregate =
      inclusionScore +
      spanInclusionScore +
      faultsScore +
      discoveredScore +
      nominatedScore +
      rankScore +
      unclaimedScore +
      bondedScore +
      locationScore +
      regionScore +
      countryScore +
      providerScore +
      offlineScore +
      nominatorStakeScore +
      clientScore;

    const randomness = 1 + Math.random() * 0.15;

    const total = aggregate * randomness || 0;

    const score = {
      total: total,
      aggregate: aggregate,
      inclusion: inclusionScore,
      spanInclusion: spanInclusionScore,
      discovered: discoveredScore,
      nominated: nominatedScore,
      rank: rankScore,
      unclaimed: unclaimedScore,
      bonded: bondedScore,
      faults: faultsScore,
      offline: offlineScore,
      location: locationScore,
      region: regionScore,
      country: countryScore,
      provider: providerScore,
      nominatorStake: nominatorStakeScore,
      client: clientScore,
      randomness: randomness,
      updated: Date.now(),
    };

    try {
      await setValidatorScore(candidate.stash, session, score);
    } catch (e) {
      logger.info(`Can't set validator score....`);
      logger.info(JSON.stringify(e));
    }
    return total;
  } catch (e) {
    logger.error(
      `Error scoring candidate ${candidate.name}`,
      e,
      constraintsLabel,
    );
    return null;
  }
};
export const scoreCandidates = async (
  constraints: OTV,
  candidates: Candidate[],
): Promise<boolean> => {
  try {
    await constraints.setScoreMetadata();
    const scoreMetadata = await getLatestValidatorScoreMetadata();

    for (const [index, candidate] of candidates.entries()) {
      const start = Date.now();

      await constraints.scoreCandidate(candidate, scoreMetadata);

      const end = Date.now();
      const time = `(${end - start}ms)`;
      const remaining = timeRemaining(
        index + 1,
        candidates.length,
        end - start,
      );

      logger.info(
        `scored ${candidate.name}: [${index + 1} / ${
          candidates.length
        }] ${percentage(index + 1, candidates.length)} ${time} ${remaining}`,
        {
          label: "Constraints",
        },
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error scoring candidates`, e, constraintsLabel);
    return false;
  }
};

export const scoreAllCandidates = async (
  constraints: OTV,
): Promise<boolean> => {
  try {
    const candidates = await validCandidates();
    logger.info(
      `scoring ${candidates.length} valid candidates..`,
      constraintsLabel,
    );
    await constraints.scoreCandidates(candidates);
    return true;
  } catch (e) {
    logger.error(`Error scoring all candidates`, e, constraintsLabel);
    return false;
  }
};
