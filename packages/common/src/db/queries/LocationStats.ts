// Creates or updates new location stats records
import { LocationStatsModel } from "../models";

export const setLocationStats = async (
  totalNodes: number,
  session: number,
  locations: Array<{ name: string; numberOfNodes: number }>,
  regions: Array<{ name: string; numberOfNodes: number }>,
  countries: Array<{ name: string; numberOfNodes: number }>,
  providers: Array<{ name: string; numberOfNodes: number }>,
  locationVariance: number,
  regionVariance: number,
  countryVariance: number,
  providerVariance: number,
  decentralization: number
): Promise<any> => {
  // Try and find an existing record
  const data = await LocationStatsModel.findOne({
    session,
  }).lean();

  // If the location stats already exist and are the same as before, return
  if (!!data && data.locations == locations) return;

  // If location stats for that session don't yet exist
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
    return locationStats.save();
  }

  // It exists, but has a different value - update it
  await LocationStatsModel.findOneAndUpdate(
    {
      session,
    },
    {
      totalNodes,
      updated: Date.now(),
      locations,
      regions,
      countries,
      providers,
      locationVariance,
      regionVariance,
      providerVariance,
      decentralization,
    }
  ).exec();
};

// Retrieves location stats for a given session
export const getSessionLocationStats = async (
  session: number
): Promise<any> => {
  const data = await LocationStatsModel.findOne({
    session,
  }).lean();
  return data;
};

// Retrieves the last location stats record (by the time it was updated)
export const getLatestLocationStats = async (): Promise<any> => {
  return (
    await LocationStatsModel.find({}).lean().sort("-session").limit(1)
  )[0];
};
