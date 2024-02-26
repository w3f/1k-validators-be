import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { LocationStats, LocationStatsModel } from "../../../src/db/models";
import {
  getLatestLocationStats,
  getSessionLocationStats,
  setLocationStats,
} from "../../../src/db/queries";
import { Db } from "../../../src/db";

let mongoServer: MongoMemoryServer;

const omitId = (obj: any) => {
  const { _id, ...rest } = obj;
  return rest;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await Db.create(mongoUri);
});

afterEach(async () => {
  await LocationStatsModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("setLocationStats", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should set location stats", async () => {
    const totalNodes = 100;
    const session = 1;
    const locations = [{ name: "Location1", numberOfNodes: 50 }];
    const regions = [{ name: "Region1", numberOfNodes: 30 }];
    const countries = [{ name: "Country1", numberOfNodes: 20 }];
    const providers = [{ name: "Provider1", numberOfNodes: 10 }];
    const locationVariance = 0.1;
    const regionVariance = 0.2;
    const countryVariance = 0.3;
    const providerVariance = 0.4;
    const decentralization = 0.5;

    await setLocationStats(
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
    );

    const expectedLocationStats: LocationStats = {
      totalNodes,
      session,
      locations,
      locationVariance,
      regions,
      regionVariance,
      countries,
      countryVariance,
      providers,
      providerVariance,
      decentralization,
      updated: expect.any(Number),
    };
  });

  it("should update existing location stats with different values", async () => {
    const session = 2;
    const initialTotalNodes = 50;
    const initialLocations: LocationStats["locations"] = [
      { name: "Location1", numberOfNodes: 20 },
    ];
    const initialRegions: LocationStats["regions"] = [
      { name: "Region1", numberOfNodes: 15 },
    ];
    const initialCountries: LocationStats["countries"] = [
      { name: "Country1", numberOfNodes: 10 },
    ];
    const initialProviders: LocationStats["providers"] = [
      { name: "Provider1", numberOfNodes: 5 },
    ];
    const initialLocationVariance = 0.1;
    const initialRegionVariance = 0.2;
    const initialCountryVariance = 0.3;
    const initialProviderVariance = 0.4;
    const initialDecentralization = 0.5;

    await new LocationStatsModel({
      totalNodes: initialTotalNodes,
      session,
      locations: initialLocations,
      regions: initialRegions,
      countries: initialCountries,
      providers: initialProviders,
      locationVariance: initialLocationVariance,
      regionVariance: initialRegionVariance,
      countryVariance: initialCountryVariance,
      providerVariance: initialProviderVariance,
      decentralization: initialDecentralization,
    }).save();

    const updatedTotalNodes = 100;
    const updatedLocations: LocationStats["locations"] = [
      { name: "Location1", numberOfNodes: 40 },
    ];
    const updatedRegions: LocationStats["regions"] = [
      { name: "Region1", numberOfNodes: 25 },
    ];
    const updatedCountries: LocationStats["countries"] = [
      { name: "Country1", numberOfNodes: 15 },
    ];
    const updatedProviders: LocationStats["providers"] = [
      { name: "Provider1", numberOfNodes: 10 },
    ];
    const updatedLocationVariance = 0.2;
    const updatedRegionVariance = 0.3;
    const updatedCountryVariance = 0.4;
    const updatedProviderVariance = 0.5;
    const updatedDecentralization = 0.6;

    await setLocationStats(
      updatedTotalNodes,
      session,
      updatedLocations,
      updatedRegions,
      updatedCountries,
      updatedProviders,
      updatedLocationVariance,
      updatedRegionVariance,
      updatedCountryVariance,
      updatedProviderVariance,
      updatedDecentralization,
    );

    const locationStats = (await LocationStatsModel.findOne({
      session,
    }).lean()) as LocationStats;
    expect(locationStats).toBeDefined();
    expect(locationStats.totalNodes).toBe(updatedTotalNodes);
    expect(locationStats.locations.map(omitId)).toEqual(
      updatedLocations.map(omitId),
    );
    expect(locationStats.regions.map(omitId)).toEqual(
      updatedRegions.map(omitId),
    );
    expect(locationStats.countries.map(omitId)).toEqual(
      updatedCountries.map(omitId),
    );
    expect(locationStats.providers.map(omitId)).toEqual(
      updatedProviders.map(omitId),
    );
    expect(locationStats.locationVariance).toBe(updatedLocationVariance);
    expect(locationStats.regionVariance).toBe(updatedRegionVariance);
    expect(locationStats.countryVariance).toBe(updatedCountryVariance);
    expect(locationStats.providerVariance).toBe(updatedProviderVariance);
    expect(locationStats.decentralization).toBe(updatedDecentralization);
  });

  it("should not update existing location stats if values are the same", async () => {
    const session = 3;
    const totalNodes = 50;
    const locations = [{ name: "Location1", numberOfNodes: 20 }];
    const regions = [{ name: "Region1", numberOfNodes: 15 }];
    const countries = [{ name: "Country1", numberOfNodes: 10 }];
    const providers = [{ name: "Provider1", numberOfNodes: 5 }];
    const locationVariance = 0.1;
    const regionVariance = 0.2;
    const countryVariance = 0.3;
    const providerVariance = 0.4;
    const decentralization = 0.5;

    // Save initial location stats
    await new LocationStatsModel({
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
    }).save();

    // Call setLocationStats with the same values
    await setLocationStats(
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
    );

    // Retrieve location stats
    const locationStats = (await LocationStatsModel.findOne({
      session,
    }).lean()) as LocationStats;
    expect(locationStats).toBeDefined();

    // Omit the _id field from the comparison
    const omitId = (obj: any) => {
      if (Array.isArray(obj)) {
        // Recursively apply omitId to each item in the array
        return obj.map((item: any) => omitId(item));
      } else if (obj && typeof obj === "object") {
        // Omit _id field if obj is an object
        const { _id, ...rest } = obj;
        return rest;
      }
      return obj;
    };

    // Check that values remain the same
    expect(omitId(locationStats).totalNodes).toBe(totalNodes);
    expect(omitId(locationStats?.locations)).toEqual(locations);
    expect(omitId(locationStats?.regions)).toEqual(regions);
    expect(omitId(locationStats?.countries)).toEqual(countries);
    expect(omitId(locationStats?.providers)).toEqual(providers);
    expect(omitId(locationStats?.locationVariance)).toBe(locationVariance);
    expect(omitId(locationStats?.regionVariance)).toBe(regionVariance);
    expect(omitId(locationStats?.countryVariance)).toBe(countryVariance);
    expect(omitId(locationStats?.providerVariance)).toBe(providerVariance);
    expect(omitId(locationStats?.decentralization)).toBe(decentralization);
  });
});

describe("getSessionLocationStats", () => {
  it("should return the location stats for the given session", async () => {
    const session = 4;
    const totalNodes = 100;
    const locations = [{ name: "Location1", numberOfNodes: 50 }];
    const regions = [{ name: "Region1", numberOfNodes: 30 }];
    const countries = [{ name: "Country1", numberOfNodes: 20 }];
    const providers = [{ name: "Provider1", numberOfNodes: 10 }];
    const locationVariance = 0.1;
    const regionVariance = 0.2;
    const countryVariance = 0.3;
    const providerVariance = 0.4;
    const decentralization = 0.5;

    await new LocationStatsModel({
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
    }).save();

    const locationStats = await getSessionLocationStats(session);
    expect(locationStats).toBeDefined();
    expect(locationStats?.session).toBe(session);
  });
});

describe("getLatestLocationStats", () => {
  it("should return the latest location stats", async () => {
    const sessions = [5, 6, 7];
    const locationStatsData = sessions.map((session) => ({
      totalNodes: session * 100,
      session,
    }));
    await LocationStatsModel.create(locationStatsData);

    const latestLocationStats = await getLatestLocationStats();
    expect(latestLocationStats).toBeDefined();
    expect(latestLocationStats?.session).toBe(sessions[2]); // Latest session should be the highest session number
  });
});
