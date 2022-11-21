import { logger, queries, ChainData, Score } from "@1kv/common";

export const locationstatsLabel = { label: "LocationStatsJob" };

export const locationStatsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  let totalNodes = [];

  const candidates = await queries.allCandidates();
  const session = await chaindata.getSession();
  await queries.setLatestSession(session);

  const locationMap = new Map();
  const locationArr = [];

  // Add all candidate entries to the list of nodes
  for (const candidate of candidates) {
    if (
      candidate.location != "None" &&
      candidate.region != "None" &&
      candidate.country != "None" &&
      candidate.provider != "None"
    ) {
      totalNodes.push({
        address: candidate.stash,
        location: candidate?.infrastructureLocation?.city,
        region: candidate?.infrastructureLocation?.region,
        country: candidate?.infrastructureLocation?.country,
        provider: candidate?.infrastructureLocation?.provider,
      });
    }
  }

  // add any additional validators from the validator set to the list of nodes
  const validatorset = await queries.getLatestValidatorSet();
  if (
    validatorset &&
    validatorset?.validators &&
    validatorset.validators.length > 0
  ) {
    for (const validatorAddress of validatorset.validators) {
      // If there's a validator that isn't already in the list of candidates
      if (
        !totalNodes.some((validator) => validator.address == validatorAddress)
      ) {
        const locations = await queries.getLocations(validatorAddress);
        const location = locations && locations[0] ? locations[0] : null;
        if (
          location &&
          location.city != "None" &&
          location.region != "None" &&
          location.country != "None" &&
          location.provider != "None"
        ) {
          totalNodes.push({
            address: validatorAddress,
            location: location.city,
            region: location.region,
            country: location.country,
            provider: location.provider,
          });
        }
      }
    }
  }
  totalNodes = totalNodes.filter((node) => {
    {
      return (
        !!node.location &&
        !!node.region &&
        !!node.country &&
        !!node.provider &&
        node.location != "None" &&
        node.region != "None" &&
        node.country != "None" &&
        node.provider != "None"
      );
    }
  });

  // Iterate through all candidates and the active validator set
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
  const locationVariance = Score.variance(locationValues);

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
  const regionVariance = Score.variance(regionValues);

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
  const countryVariance = Score.variance(countryValues);

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
  const providerVariance = Score.variance(providerValues);

  const decentralization =
    (locationVariance + regionVariance + countryVariance + providerVariance) /
    4;

  // --------------------------

  await queries.setLocationStats(
    totalNodes.length,
    session,
    locationArr,
    regionArr,
    countryArr,
    providerArr,
    locationVariance,
    regionVariance,
    countryVariance,
    providerVariance,
    decentralization
  );

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, locationstatsLabel);
};

export const processLocationStatsJob = async (
  job: any,
  chaindata: ChainData
) => {
  logger.info(`Processing Era Stats Job....`, locationstatsLabel);
  await locationStatsJob(chaindata);
};
