import { logger } from "../index";
import { getStats, LocationStats, Stats } from "./score";
import {
  allNominators,
  Candidate,
  getCandidateLocation,
  getLatestNominatorStake,
} from "../db";
import { constraintsLabel } from "./constraints";
import { NoLocation } from "../types";

export const getBondedValues = (
  validCandidates: Candidate[],
): { bondedValues: number[]; bondedStats: Stats } => {
  const bondedValues = validCandidates.map((candidate) => {
    return candidate.bonded ? candidate.bonded : 0;
  });
  const bondedStats = getStats(bondedValues);
  return { bondedValues, bondedStats };
};

export const getFaultsValues = (
  validCandidates: Candidate[],
): { faultsValues: string[] | number[]; faultsStats: Stats } => {
  const faultsValues = validCandidates.map((candidate) => {
    return candidate.faults ? candidate.faults : 0;
  });
  const faultsStats = getStats(faultsValues);
  return { faultsValues, faultsStats };
};

export const getInclusionValues = (
  validCandidates: Candidate[],
): { inclusionValues: string[] | number[]; inclusionStats: Stats } => {
  const inclusionValues = validCandidates.map((candidate) => {
    return candidate.inclusion ? candidate.inclusion : 0;
  });
  const inclusionStats = getStats(inclusionValues);
  return { inclusionValues, inclusionStats };
};

export const getSpanInclusionValues = (
  validCandidates: Candidate[],
): { spanInclusionValues: string[] | number[]; spanInclusionStats: Stats } => {
  const spanInclusionValues = validCandidates.map((candidate) => {
    return candidate.spanInclusion ? candidate.spanInclusion : 0;
  });
  const spanInclusionStats = getStats(spanInclusionValues);
  return { spanInclusionValues, spanInclusionStats };
};

export const getDiscoveredAtValues = (
  validCandidates: Candidate[],
): { discoveredAtValues: string[] | number[]; discoveredAtStats: Stats } => {
  const discoveredAtValues = validCandidates.map((candidate) => {
    return candidate.discoveredAt ? candidate.discoveredAt : 0;
  });
  const discoveredAtStats = getStats(discoveredAtValues);
  return { discoveredAtValues, discoveredAtStats };
};

export const getNominatedAtValues = (
  validCandidates: Candidate[],
): { nominatedAtValues: string[] | number[]; nominatedAtStats: Stats } => {
  const nominatedAtValues: string[] | number[] = validCandidates.map(
    (candidate) => {
      return candidate.nominatedAt ? candidate.nominatedAt : 0;
    },
  );
  const nominatedAtStats: Stats = getStats(nominatedAtValues as number[]);
  return { nominatedAtValues, nominatedAtStats };
};

export const getOfflineValues = (
  validCandidates: Candidate[],
): { offlineValues: string[] | number[]; offlineStats: Stats } => {
  const offlineValues: string[] | number[] = validCandidates.map(
    (candidate) => {
      return candidate.offlineAccumulated ? candidate.offlineAccumulated : 0;
    },
  );
  const offlineStats: Stats = getStats(offlineValues as number[]);
  return { offlineValues, offlineStats };
};

export const getRankValues = (
  validCandidates: Candidate[],
): { rankValues: string[] | number[]; rankStats: Stats } => {
  const rankValues: string[] | number[] = validCandidates.map((candidate) => {
    return candidate.rank ? candidate.rank : 0;
  });
  const rankStats: Stats = getStats(rankValues as number[]);
  return { rankValues, rankStats };
};

export const getUnclaimedValues = (
  validCandidates: Candidate[],
): { unclaimedValues: string[] | number[]; unclaimedStats: Stats } => {
  const unclaimedValues: string[] | number[] = validCandidates.map(
    (candidate) => {
      return candidate.unclaimedEras && candidate.unclaimedEras.length
        ? candidate.unclaimedEras.length
        : 0;
    },
  );
  const unclaimedStats: Stats = getStats(unclaimedValues as number[]);
  return { unclaimedValues, unclaimedStats };
};

export const getLocationValues = async (
  validCandidates: Candidate[],
): Promise<{
  locationArr: { name: string; numberOfNodes: number }[];
  locationValues: number[];
  locationStats: LocationStats;
}> => {
  const locationMap = new Map<string, number>();
  const locationArr: { name: string; numberOfNodes: number }[] = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await getCandidateLocation(candidate.slotId);
    const location = candidateLocation?.city || NoLocation.NoLocation;

    const locationCount = locationMap.get(location);
    if (!locationCount) {
      locationMap.set(location, 1);
    } else {
      locationMap.set(location, locationCount + 1);
    }
  }

  for (const [location, numberOfNodes] of locationMap.entries()) {
    locationArr.push({ name: location, numberOfNodes });
  }

  const locationValues: number[] = locationArr.map((location) => {
    return location.numberOfNodes;
  });
  const locationStats = getStats(locationValues);

  const lStats = { ...locationStats, values: locationArr };
  return { locationArr, locationValues, locationStats: lStats };
};

export const getRegionValues = async (
  validCandidates: Candidate[],
): Promise<{
  regionArr: { name: string; numberOfNodes: number }[];
  regionValues: string[] | number[];
  regionStats: LocationStats;
}> => {
  const regionMap = new Map<string, number>();
  const regionArr: { name: string; numberOfNodes: number }[] = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await getCandidateLocation(candidate.slotId);
    const region =
      candidateLocation && candidateLocation.region
        ? candidateLocation.region
        : NoLocation.NoLocation;

    const regionCount = regionMap.get(region);
    if (!regionCount) {
      regionMap.set(region, 1);
    } else {
      regionMap.set(region, regionCount + 1);
    }
  }

  for (const [region, numberOfNodes] of regionMap.entries()) {
    regionArr.push({ name: region, numberOfNodes });
  }
  const regionValues: string[] | number[] = regionArr.map((region) => {
    return region.numberOfNodes;
  });
  const regionStats: Stats = getStats(regionValues as number[]);
  // regionStats.numberOfNodes = regionValues;

  const rStats = { ...regionStats, values: regionArr };
  return { regionArr, regionValues, regionStats: rStats };
};

export const getCountryValues = async (
  validCandidates: Candidate[],
): Promise<{
  countryArr: { name: string; numberOfNodes: number }[];
  countryValues: string[] | number[];
  countryStats: LocationStats;
}> => {
  const countryMap = new Map<string, number>();
  const countryArr: { name: string; numberOfNodes: number }[] = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await getCandidateLocation(candidate.slotId);
    const country =
      candidateLocation && candidateLocation.country
        ? candidateLocation.country
        : NoLocation.NoLocation;

    const countryCount = countryMap.get(country);
    if (!countryCount) {
      countryMap.set(country, 1);
    } else {
      countryMap.set(country, countryCount + 1);
    }
  }

  for (const [country, numberOfNodes] of countryMap.entries()) {
    countryArr.push({ name: country, numberOfNodes });
  }
  const countryValues: string[] | number[] = countryArr.map((country) => {
    return country.numberOfNodes;
  });
  const countryStats: Stats = getStats(countryValues as number[]);
  const cStats = { ...countryStats, values: countryArr };
  return { countryArr, countryValues, countryStats: cStats };
};

export const getProviderValues = async (
  validCandidates: Candidate[],
): Promise<{
  providerArr: { name: string; numberOfNodes: number }[];
  providerValues: string[] | number[];
  providerStats: LocationStats;
}> => {
  const providerMap = new Map<string, number>();
  const providerArr: { name: string; numberOfNodes: number }[] = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await getCandidateLocation(candidate.slotId);
    const provider =
      candidateLocation && candidateLocation.provider
        ? candidateLocation.provider
        : NoLocation.NoProvider;

    const providerCount = providerMap.get(provider);
    if (!providerCount) {
      providerMap.set(provider, 1);
    } else {
      providerMap.set(provider, providerCount + 1);
    }
  }

  for (const [provider, numberOfNodes] of providerMap.entries()) {
    providerArr.push({ name: provider, numberOfNodes });
  }
  const providerValues: string[] | number[] = providerArr.map((provider) => {
    return provider.numberOfNodes;
  });
  const providerStats: Stats = getStats(providerValues as number[]);
  const pStats = { ...providerStats, values: providerArr };

  return { providerArr, providerValues, providerStats: pStats };
};

export const getNominatorStakeValues = async (
  validCandidates: Candidate[],
): Promise<{
  ownNominatorAddresses: string[];
  nominatorStakeValues: number[];
  nominatorStakeStats: Stats;
}> => {
  const ownNominators = await allNominators();
  const ownNominatorAddresses = ownNominators.map((nom) => {
    return nom.address;
  });
  const nominatorStakeValues: number[] = [];
  for (const [index, candidate] of validCandidates.entries()) {
    const nomStake = await getLatestNominatorStake(candidate.stash);
    if (
      nomStake != undefined &&
      nomStake.activeNominators &&
      nomStake.inactiveNominators
    ) {
      try {
        const { activeNominators, inactiveNominators } = nomStake;
        let total = 0;
        for (const active of activeNominators) {
          if (!ownNominatorAddresses.includes(active.address)) {
            total += Math.sqrt(active.bonded);
          }
        }
        for (const inactive of inactiveNominators) {
          if (!ownNominatorAddresses.includes(inactive.address)) {
            total += Math.sqrt(inactive.bonded);
          }
        }
        nominatorStakeValues.push(total);
      } catch (e) {
        logger.warn(
          `Can't find nominator stake values for ${candidate.name}`,
          constraintsLabel,
        );
      }
    }
  }

  const nominatorStakeStats: Stats = getStats(nominatorStakeValues);
  return { ownNominatorAddresses, nominatorStakeValues, nominatorStakeStats };
};
