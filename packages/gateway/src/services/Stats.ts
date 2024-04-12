import { Constants, queries, Score } from "@1kv/common";
import { requestEmitter } from "../events/requestEmitter";

export const getLocationStats = async () => {
  const locationStats = await queries.getLatestLocationStats();
  if (!locationStats) return;
  const sortedLocations = locationStats?.locations?.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedRegions = locationStats?.regions.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedCountries = locationStats.countries.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedProviders = locationStats.providers.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  return {
    totalNodes: locationStats.totalNodes,
    session: locationStats.session,
    updated: locationStats.updated,
    locations: sortedLocations,
    regions: sortedRegions,
    countries: sortedCountries,
    providers: sortedProviders,
    locationVariance: locationStats.locationVariance,
    regionVariance: locationStats.regionVariance,
    countyVariance: locationStats.countryVariance,
    providerVaraince: locationStats.providerVariance,
    decentralization: locationStats.decentralization,
  };
};

export const getValidLocationStats = async () => {
  const candidates = await queries.validCandidates();
  const totalNodes = [];

  for (const candidate of candidates) {
    const location = await queries.getCandidateLocation(candidate.slotId);
    if (
      location?.city != "None" &&
      location?.region != "None" &&
      location?.country != "None" &&
      location?.provider != "None"
    ) {
      totalNodes.push({
        address: candidate.stash,
        location: location?.city,
        region: location?.region,
        country: location?.country,
        provider: location?.provider,
      });
    }
  }

  const locationMap = new Map();
  const locationArr = [];
  for (const node of totalNodes) {
    const location = node.location;
    if (!location) {
      continue;
    }

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

  const scoredLocation = locationArr.map((location) => {
    const score = Score.scaledDefined(
      location.numberOfNodes,
      locationValues,
      0,
      1,
    );
    const weightedScore = (1 - score) * Constants.LOCATION_WEIGHT || 0;
    return { ...location, score: weightedScore };
  });

  // ---------------- REGION -----------------------------------
  const regionMap = new Map();
  const regionArr = [];
  for (const node of totalNodes) {
    const region = node?.region;

    if (!region) {
      continue;
    }

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

  const scoredRegion = regionArr.map((region) => {
    const score = Score.scaledDefined(region.numberOfNodes, regionValues, 0, 1);
    const weightedScore = (1 - score) * Constants.REGION_WEIGHT || 0;
    return { ...region, score: weightedScore };
  });

  // ---------------- COUNTRY -----------------------------------
  const countryMap = new Map();
  const countryArr = [];
  for (const node of totalNodes) {
    const country = node?.country;

    if (!country) {
      continue;
    }

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

  const scoredCountry = countryArr.map((country) => {
    const score = Score.scaledDefined(
      country.numberOfNodes,
      countryValues,
      0,
      1,
    );
    const weightedScore = (1 - score) * Constants.COUNTRY_WEIGHT || 0;
    return { ...country, score: weightedScore };
  });

  // ---------------- PROVIDER -----------------------------------
  const providerMap = new Map();
  const providerArr = [];
  for (const node of totalNodes) {
    const provider = node?.provider;

    if (!provider) {
      continue;
    }

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

  const scoredProvider = providerArr.map((provider) => {
    const score = Score.scaledDefined(
      provider.numberOfNodes,
      providerValues,
      0,
      1,
    );
    const weightedScore = (1 - score) * Constants.PROVIDER_WEIGHT || 0;
    return { ...provider, score: weightedScore };
  });

  const sortedLocations = scoredLocation?.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedRegions = scoredRegion.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedCountries = scoredCountry.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedProviders = scoredProvider.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  return {
    totalNodes: totalNodes.length,
    locations: sortedLocations,
    regions: sortedRegions,
    countries: sortedCountries,
    providers: sortedProviders,
  };
};

export const getSessionLocationStats = async (session) => {
  const locationStats = await queries.getSessionLocationStats(Number(session));
  const sortedLocations = locationStats.locations.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedRegions = locationStats?.regions.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedCountries = locationStats.countries.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedProviders = locationStats.providers.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  return {
    totalNodes: locationStats.totalNodes,
    session: locationStats.session,
    updated: locationStats.updated,
    locations: sortedLocations,
    regions: sortedRegions,
    countries: sortedCountries,
    providers: sortedProviders,
    locationVariance: locationStats.locationVariance,
    regionVariance: locationStats.regionVariance,
    countyVariance: locationStats.countryVariance,
    providerVariance: locationStats.providerVariance,
    decentralization: locationStats.decentralization,
  };
};

export const getEraStats = async (): Promise<any> => {
  const latestEraStats = await queries.getLatestEraStats();
  return latestEraStats;
};

export const getTotalRequests = async (): Promise<any> => {
  return requestEmitter.listenerCount("requestReceived");
};

export const getEndpointCounts = async (): Promise<{
  [key: string]: number;
}> => {
  const endpointCounts: { [key: string]: number } = {};

  requestEmitter.eventNames().forEach((event) => {
    const endpoint = event.toString();
    endpointCounts[endpoint] = requestEmitter.listenerCount(event);
  });

  return endpointCounts;
};
