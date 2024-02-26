import { LocationStatsModel } from "../models";

interface LocationStats {
  totalNodes: number;
  session: number;
  locations: { name: string; numberOfNodes: number }[];
  locationVariance: number;
  regions: { name: string; numberOfNodes: number }[];
  regionVariance: number;
  countries: { name: string; numberOfNodes: number }[];
  countryVariance: number;
  providers: { name: string; numberOfNodes: number }[];
  providerVariance: number;
  decentralization: number;
  updated: number;
}

export const setLocationStats = async (
  totalNodes: number,
  session: number,
  locations: { name: string; numberOfNodes: number }[],
  regions: { name: string; numberOfNodes: number }[],
  countries: { name: string; numberOfNodes: number }[],
  providers: { name: string; numberOfNodes: number }[],
  locationVariance: number,
  regionVariance: number,
  countryVariance: number,
  providerVariance: number,
  decentralization: number,
): Promise<boolean> => {
  try {
    // Try to find an existing record
    const data = await LocationStatsModel.findOne({ session }).lean();

    // If the location stats already exist and are the same as before, return false
    if (
      !!data &&
      data.totalNodes === totalNodes &&
      data.locationVariance === locationVariance &&
      data.regionVariance === regionVariance &&
      data.countryVariance === countryVariance &&
      data.providerVariance === providerVariance &&
      data.decentralization === decentralization &&
      isEqual(data.locations, locations) &&
      isEqual(data.regions, regions) &&
      isEqual(data.countries, countries) &&
      isEqual(data.providers, providers)
    ) {
      return false;
    }

    // If location stats for that session don't yet exist, create them
    if (!data) {
      const locationStats = new LocationStatsModel({
        totalNodes,
        session,
        locations,
        regions,
        countries,
        providers,
        locationVariance,
        regionVariance,
        countryVariance,
        providerVariance,
        decentralization,
        updated: Date.now(),
      });
      await locationStats.save();
      return true;
    }

    // Update existing location stats
    await LocationStatsModel.findOneAndUpdate(
      { session },
      {
        totalNodes,
        locations,
        locationVariance,
        regions,
        regionVariance,
        countries,
        countryVariance,
        providers,
        providerVariance,
        decentralization,
        updated: Date.now(),
      },
    ).exec();

    return true;
  } catch (error) {
    console.error("Error setting location stats:", error);
    return false;
  }
};

export const getSessionLocationStats = async (
  session: number,
): Promise<LocationStats | null> => {
  const data = await LocationStatsModel.findOne({ session }).lean();
  return data as LocationStats | null;
};

export const getLatestLocationStats =
  async (): Promise<LocationStats | null> => {
    const data = await LocationStatsModel.findOne({})
      .lean()
      .sort("-session")
      .limit(1);
    return data as LocationStats | null;
  };

function isEqual(arr1: any[], arr2: any[]) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((elem, index) => {
    return Object.keys(elem).every((key) => elem[key] === arr2[index][key]);
  });
}
