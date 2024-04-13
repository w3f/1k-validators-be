import { logger, queries, Score } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";
import { JobNames } from "../JobConfigs";

export const locationstatsLabel = { label: "LocationStatsJob" };

export class LocationStatsJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const locationStatsJob = async (metadata: JobRunnerMetadata) => {
  try {
    const { chaindata } = metadata;
    await queries.cleanBlankLocations();

    jobStatusEmitter.emit("jobProgress", {
      name: JobNames.LocationStats,
      progress: 25,
      updated: Date.now(),
    });

    let totalNodes = [];

    const candidates = await queries.allCandidates();
    const session = await chaindata.getSession();
    if (!session) {
      logger.error("Error getting current session", locationstatsLabel);
      return false;
    }
    await queries.setLatestSession(session);

    const locationMap = new Map();
    const locationArr = [];

    jobStatusEmitter.emit("jobProgress", {
      name: JobNames.LocationStats,
      progress: 50,
      updated: Date.now(),
    });

    // Add all candidate entries to the list of nodes
    for (const [index, candidate] of candidates.entries()) {
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

      // Emit progress update for each candidate processed
      const progressPercentage = ((index + 1) / candidates.length) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed candidate ${candidate.name}`,
      });
    }

    // add any additional validators from the validator set to the list of nodes
    const validatorset = await queries.getLatestValidatorSet();
    if (
      validatorset &&
      validatorset?.validators &&
      validatorset.validators.length > 0
    ) {
      for (const [
        index,
        validatorAddress,
      ] of validatorset.validators.entries()) {
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

        // Emit progress update for each validator processed
        const progressPercentage =
          ((index + 1) / validatorset.validators.length) * 100;
        jobStatusEmitter.emit("jobProgress", {
          name: JobNames.LocationStats,
          progress: progressPercentage,
          updated: Date.now(),
          iteration: `Processed validator ${validatorAddress}`,
        });
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

    jobStatusEmitter.emit("jobProgress", {
      name: JobNames.LocationStats,
      progress: 75,
      updated: Date.now(),
    });

    // Iterate through all candidates and the active validator set
    for (const [index, node] of totalNodes.entries()) {
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

      // Emit progress update for each node processed
      const progressPercentage = ((index + 1) / totalNodes.length) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed node ${node.address}`,
      });
    }

    for (const [name, numberOfNodes] of locationMap.entries()) {
      locationArr.push({ name, numberOfNodes });

      // Emit progress update for each location processed
      const progressPercentage = (locationArr.length / locationMap.size) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed location ${name}`,
      });
    }

    const locationValues: number[] = locationArr.map((location) => {
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

    for (const [name, numberOfNodes] of regionMap.entries()) {
      regionArr.push({ name, numberOfNodes });

      // Emit progress update for each region processed
      const progressPercentage = (regionArr.length / regionMap.size) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed region ${name}`,
      });
    }

    const regionValues: number[] = regionArr.map((region) => {
      return region.numberOfNodes;
    });
    const regionVariance: number = Score.variance(regionValues);

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

    for (const [name, numberOfNodes] of countryMap.entries()) {
      countryArr.push({ name, numberOfNodes });

      // Emit progress update for each country processed
      const progressPercentage = (countryArr.length / countryMap.size) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed country ${name}`,
      });
    }

    const countryValues: number[] = countryArr.map((country) => {
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

    for (const [name, numberOfNodes] of providerMap.entries()) {
      providerArr.push({ name, numberOfNodes });

      // Emit progress update for each provider processed
      const progressPercentage = (providerArr.length / providerMap.size) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: JobNames.LocationStats,
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed provider ${name}`,
      });
    }

    const providerValues: number[] = providerArr.map((provider) => {
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
      decentralization,
    );

    jobStatusEmitter.emit("jobProgress", {
      name: "Location Stats Job",
      progress: 100,
      updated: Date.now(),
    });

    return true;
  } catch (e) {
    logger.error(`Error running location stats job: ${e}`, locationstatsLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.LocationStats,
      updated: Date.now(),
      error: JSON.stringify(e),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
    return false;
  }
};

export const locationStatsJobWithTiming = withExecutionTimeLogging(
  locationStatsJob,
  locationstatsLabel,
  "Location Stats Job Done",
);

export const processLocationStatsJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  logger.info(`Processing Era Stats Job....`, locationstatsLabel);
  await locationStatsJob(metadata);
};
