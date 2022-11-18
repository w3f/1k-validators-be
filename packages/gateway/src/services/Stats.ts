import { queries } from "@1kv/common";

export const getLocationStats = async () => {
  const locationStats = await queries.getLatestLocationStats();
  const sortedLocations = locationStats?.locations?.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedRegions = locationStats.regions.sort((a, b) => {
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

export const getSessionLocationStats = async (session) => {
  const locationStats = await queries.getSessionLocationStats(Number(session));
  const sortedLocations = locationStats.locations.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedRegions = locationStats.regions.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedCountries = locationStats.countries.sort((a, b) => {
    return b.numberOfNodes - a.numberOfNodes;
  });
  const sortedASNs = locationStats.asns.sort((a, b) => {
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
