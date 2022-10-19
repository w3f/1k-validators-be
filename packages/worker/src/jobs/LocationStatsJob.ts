import { Queue } from "bullmq";
import { logger, Db, ChainData, ApiHandler, Score } from "@1kv/common";

export const locationStatsJob = async (db, chaindata: ChainData) => {
  const start = Date.now();

  const candidates = await db.allCandidates();
  const session = await chaindata.getSession();

  const locationMap = new Map();
  const locationArr = [];

  // Iterate through all candidates and set
  for (const candidate of candidates) {
    const location = candidate.location || "No Location";
    const address = candidate.stash;

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
  const locationVariance = Score.variance(locationValues);

  // ---------------- CITY -----------------------------------
  const cityMap = new Map();
  const cityArr = [];
  for (const candidate of candidates) {
    const city =
      candidate.infrastructureLocation && candidate.infrastructureLocation.city
        ? candidate.infrastructureLocation.city
        : "No Location";

    const cityCount = cityMap.get(city);
    if (!cityCount) {
      cityMap.set(city, 1);
    } else {
      cityMap.set(city, cityCount + 1);
    }
  }

  for (const city of cityMap.entries()) {
    const [name, numberOfNodes] = city;
    cityArr.push({ name, numberOfNodes });
  }

  const cityValues = cityArr.map((city) => {
    return city.numberOfNodes;
  });
  const cityVariance = Score.variance(cityValues);

  // ---------------- REGION -----------------------------------
  const regionMap = new Map();
  const regionArr = [];
  for (const candidate of candidates) {
    const region =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.region
        ? candidate.infrastructureLocation.region
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
  const regionVariance = Score.variance(regionValues);

  // ---------------- COUNTRY -----------------------------------
  const countryMap = new Map();
  const countryArr = [];
  for (const candidate of candidates) {
    const country =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.country
        ? candidate.infrastructureLocation.country
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
  const countryVariance = Score.variance(countryValues);

  // ---------------- ASN -----------------------------------
  const asnMap = new Map();
  const asnArr = [];
  for (const candidate of candidates) {
    const asn =
      candidate.infrastructureLocation && candidate.infrastructureLocation.asn
        ? candidate.infrastructureLocation.asn
        : "No Location";

    const asnCount = asnMap.get(asn);
    if (!asnCount) {
      asnMap.set(asn, 1);
    } else {
      asnMap.set(asn, asnCount + 1);
    }
  }

  for (const asn of asnMap.entries()) {
    const [name, numberOfNodes] = asn;
    asnArr.push({ name, numberOfNodes });
  }
  const asnValues = asnArr.map((asn) => {
    return asn.numberOfNodes;
  });
  const asnVariance = Score.variance(asnValues);

  // ---------------- PROVIDER -----------------------------------
  const providerMap = new Map();
  const providerArr = [];
  for (const candidate of candidates) {
    const provider =
      candidate.infrastructureLocation &&
      candidate.infrastructureLocation.provider
        ? candidate.infrastructureLocation.provider
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
  const providerVariance = Score.variance(providerValues);

  const decentralization =
    (locationVariance +
      regionVariance +
      countryVariance +
      asnVariance +
      providerVariance) /
    5;

  // --------------------------

  await db.setLocationStats(
    session,
    locationArr,
    regionArr,
    countryArr,
    asnArr,
    providerArr,
    locationVariance,
    regionVariance,
    countryVariance,
    asnVariance,
    providerVariance,
    decentralization
  );

  const end = Date.now();

  logger.info(
    `{cron::locationStatsJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};
