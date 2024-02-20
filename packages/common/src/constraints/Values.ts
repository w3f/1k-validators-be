import { logger, queries } from "../index";
import { getStats } from "./score";
import { allNominators, Candidate, getLatestNominatorStake } from "../db";
import { constraintsLabel } from "./constraints";

export const getBondedValues = (validCandidates: Candidate[]) => {
  const bondedValues = validCandidates.map((candidate) => {
    return candidate.bonded ? candidate.bonded : 0;
  });
  const bondedStats = bondedValues.length > 0 ? getStats(bondedValues) : [];
  return { bondedValues, bondedStats };
};

export const getFaultsValues = (validCandidates: Candidate[]) => {
  const faultsValues = validCandidates.map((candidate) => {
    return candidate.faults ? candidate.faults : 0;
  });
  const faultsStats = getStats(faultsValues);
  return { faultsValues, faultsStats };
};

export const getInclusionValues = (validCandidates: Candidate[]) => {
  const inclusionValues = validCandidates.map((candidate) => {
    return candidate.inclusion ? candidate.inclusion : 0;
  });
  const inclusionStats = getStats(inclusionValues);
  return { inclusionValues, inclusionStats };
};

export const getSpanInclusionValues = (validCandidates: Candidate[]) => {
  const spanInclusionValues = validCandidates.map((candidate) => {
    return candidate.spanInclusion ? candidate.spanInclusion : 0;
  });
  const spanInclusionStats = getStats(spanInclusionValues);
  return { spanInclusionValues, spanInclusionStats };
};

export const getDiscoveredAtValues = (validCandidates: Candidate[]) => {
  const discoveredAtValues = validCandidates.map((candidate) => {
    return candidate.discoveredAt ? candidate.discoveredAt : 0;
  });
  const discoveredAtStats = getStats(discoveredAtValues);
  return { discoveredAtValues, discoveredAtStats };
};

export const getNominatedAtValues = (validCandidates: Candidate[]) => {
  const nominatedAtValues = validCandidates.map((candidate) => {
    return candidate.nominatedAt ? candidate.nominatedAt : 0;
  });
  const nominatedAtStats = getStats(nominatedAtValues);
  return { nominatedAtValues, nominatedAtStats };
};

export const getOfflineValues = (validCandidates: Candidate[]) => {
  const offlineValues = validCandidates.map((candidate) => {
    return candidate.offlineAccumulated ? candidate.offlineAccumulated : 0;
  });
  const offlineStats = getStats(offlineValues);
  return { offlineValues, offlineStats };
};

export const getRankValues = (validCandidates: Candidate[]) => {
  const rankValues = validCandidates.map((candidate) => {
    return candidate.rank ? candidate.rank : 0;
  });
  const rankStats = getStats(rankValues);
  return { rankValues, rankStats };
};

export const getUnclaimedValues = (validCandidates: Candidate[]) => {
  const unclaimedValues = validCandidates.map((candidate) => {
    return candidate.unclaimedEras && candidate.unclaimedEras.length
      ? candidate.unclaimedEras.length
      : 0;
  });
  const unclaimedStats = getStats(unclaimedValues);
  return { unclaimedValues, unclaimedStats };
};

export const getLocationValues = async (validCandidates: Candidate[]) => {
  const locationMap = new Map();
  const locationArr = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await queries.getCandidateLocation(
      candidate.name,
    );
    const location = candidateLocation?.city || "No Location";

    const locationCount = locationMap.get(location);
    if (!locationCount) {
      locationMap.set(location, 1);
    } else {
      locationMap.set(location, locationCount + 1);
    }
  }

  for (const location of locationMap.entries()) {
    const [name, numberOfNodes] = location;
    locationArr.push({ name, numberOfNodes });
  }

  const locationValues = locationArr.map((location) => {
    return location.numberOfNodes;
  });
  const locationStats = getStats(locationValues);
  locationStats.values = locationArr;
  return { locationArr, locationValues, locationStats };
};

export const getRegionValues = async (validCandidates: Candidate[]) => {
  const regionMap = new Map();
  const regionArr = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await queries.getCandidateLocation(
      candidate.name,
    );
    const region =
      candidateLocation && candidateLocation?.region
        ? candidateLocation?.region
        : "No Location";

    const regionCount = regionMap.get(region);
    if (!regionCount) {
      regionMap.set(region, 1);
    } else {
      regionMap.set(region, regionCount + 1);
    }
  }

  for (const region of regionMap.entries()) {
    const [name, numberOfNodes] = region;
    regionArr.push({ name, numberOfNodes });
  }
  const regionValues = regionArr.map((region) => {
    return region.numberOfNodes;
  });
  const regionStats = getStats(regionValues);
  regionStats.values = regionArr;
  return { regionArr, regionValues, regionStats };
};

export const getCountryValues = async (validCandidates: Candidate[]) => {
  const countryMap = new Map();
  const countryArr = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await queries.getCandidateLocation(
      candidate.name,
    );
    const country =
      candidateLocation && candidateLocation?.country
        ? candidateLocation?.country
        : "No Location";

    const countryCount = countryMap.get(country);
    if (!countryCount) {
      countryMap.set(country, 1);
    } else {
      countryMap.set(country, countryCount + 1);
    }
  }

  for (const country of countryMap.entries()) {
    const [name, numberOfNodes] = country;
    countryArr.push({ name, numberOfNodes });
  }
  const countryValues = countryArr.map((country) => {
    return country.numberOfNodes;
  });
  const countryStats = getStats(countryValues);
  countryStats.values = countryArr;
  return { countryArr, countryValues, countryStats };
};

export const getProviderValues = async (validCandidates: Candidate[]) => {
  const providerMap = new Map();
  const providerArr = [];
  for (const candidate of validCandidates) {
    const candidateLocation = await queries.getCandidateLocation(
      candidate.name,
    );
    const provider =
      candidateLocation && candidateLocation?.provider
        ? candidateLocation?.provider
        : "No Location";

    const providerCount = providerMap.get(provider);
    if (!providerCount) {
      providerMap.set(provider, 1);
    } else {
      providerMap.set(provider, providerCount + 1);
    }
  }

  for (const provider of providerMap.entries()) {
    const [name, numberOfNodes] = provider;
    providerArr.push({ name, numberOfNodes });
  }
  const providerValues = providerArr.map((provider) => {
    return provider.numberOfNodes;
  });
  const providerStats = getStats(providerValues);
  providerStats.values = providerArr;
  return { providerArr, providerValues, providerStats };
};

export const getNominatorStakeValues = async (validCandidates: Candidate[]) => {
  const ownNominators = await allNominators();
  const ownNominatorAddresses = ownNominators.map((nom) => {
    return nom.address;
  });
  const nominatorStakeValues = [];
  for (const [index, candidate] of validCandidates.entries()) {
    const nomStake = await getLatestNominatorStake(candidate.stash);
    if (
      nomStake != undefined &&
      nomStake?.activeNominators &&
      nomStake?.inactiveNominators
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
  if (nominatorStakeValues.length == 0) nominatorStakeValues.push(0);
  const nominatorStakeStats = getStats(nominatorStakeValues);
  return { ownNominatorAddresses, nominatorStakeValues, nominatorStakeStats };
};
