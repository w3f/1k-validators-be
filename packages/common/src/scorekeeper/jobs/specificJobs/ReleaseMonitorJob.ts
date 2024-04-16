import { logger, queries } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import { JobNames } from "../JobConfigs";
import { jobStatusEmitter } from "../../../Events";
import { Octokit } from "@octokit/rest";

export const monitorLabel = { label: "Monitor" };

export class MonitorJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const getLatestTaggedRelease = async () => {
  try {
    const start = Date.now();

    logger.info(`Running Monitor job`, monitorLabel);

    let latestRelease;
    const ghApi = new Octokit();

    try {
      const { data: releases } = await ghApi.rest.repos.listReleases({
        owner: "paritytech",
        repo: "polkadot-sdk",
      });

      // Filter releases based on tag name
      const filteredReleases = releases.filter((release) => {
        // Check if the tag name matches the pattern 'polkadot-v*.*.*' (this is the polkadot client node version, as opposed to any kind of parachain node)
        return release.tag_name.startsWith("polkadot-v");
      });

      // Sort filtered releases based on their version number
      filteredReleases.sort((a, b) => {
        // Extract version numbers from tag names
        const versionA = a.tag_name.split("polkadot-v")[1];
        const versionB = b.tag_name.split("polkadot-v")[1];

        // Compare version numbers
        return compareVersions(versionA, versionB);
      });
      // logger.info(JSON.stringify(filteredReleases[0]));
      // logger.info(JSON.stringify(filteredReleases[0].tag_name));

      // Get the last release
      latestRelease = filteredReleases[filteredReleases?.length - 1];
      logger.info(JSON.stringify(latestRelease.tag_name));
    } catch (e) {
      logger.info(JSON.stringify(e));
      logger.info(
        "{Monitor::getLatestTaggedRelease} Could not get latest release.",
      );
    }

    if (!latestRelease) return null;
    const { tag_name, published_at } = latestRelease;
    const publishedAt = new Date(published_at).getTime();

    // Extract version number from the tag name
    const versionMatch = tag_name.match(/v?(\d+\.\d+\.\d+)/);
    if (!versionMatch) {
      logger.warn(`Unable to extract version from tag name: ${tag_name}`);
      return null;
    }
    const version = versionMatch[1];
    await queries.setRelease(version, publishedAt);

    const end = Date.now();

    logger.info(`Done. Took ${(end - start) / 1000} seconds`, monitorLabel);
  } catch (e) {
    logger.error(`Error running monitor job: ${e}`, monitorLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.Monitor,
      updated: Date.now(),
      error: JSON.stringify(e),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
  }
};

// Called by worker to process Job
export const processReleaseMonitorJob = async (job: any) => {
  await getLatestTaggedRelease();
};

export const compareVersions = (versionA, versionB) => {
  try {
    const partsA = versionA.split(".").map((part) => parseInt(part, 10));
    const partsB = versionB.split(".").map((part) => parseInt(part, 10));

    for (let i = 0; i < Math.max(partsA?.length, partsB?.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA < partB) {
        return -1;
      } else if (partA > partB) {
        return 1;
      }
    }

    return 0; // Versions are equal
  } catch (e) {
    logger.error(`Error comparing versions: ${e}`, monitorLabel);
    return null;
  }
};
