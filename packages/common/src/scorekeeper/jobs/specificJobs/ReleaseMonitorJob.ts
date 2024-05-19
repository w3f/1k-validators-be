import { logger, queries } from "../../../index";
import { Octokit } from "@octokit/rest";
import { JobEvent, JobKey, JobRunnerMetadata, JobStatus } from "../types";
import { jobStatusEmitter } from "../../../Events";

export const monitorLabel = { label: "Monitor" };

export const getLatestTaggedRelease = async (
  jobRunnerMetadata?: JobRunnerMetadata,
) => {
  try {
    const start = Date.now();

    logger.info(`Running Monitor job`, monitorLabel);

    let latestRelease;
    const ghApi = new Octokit();

    try {
      const release = await ghApi.repos.getLatestRelease({
        owner: "paritytech",
        repo: "polkadot-sdk",
      });
      latestRelease = release?.data;
    } catch {
      logger.warn("Could not get latest release.", monitorLabel);
    }

    if (
      !latestRelease ||
      !latestRelease.tag_name ||
      !latestRelease.published_at
    ) {
      return;
    }

    const { tag_name, published_at } = latestRelease;
    const publishedAt = new Date(published_at).getTime();

    const version = tag_name.split("-")[1];

    await queries.setRelease(version, publishedAt);

    const taggedReleaseName = latestRelease ? latestRelease.name : "";
    if (latestRelease && version === taggedReleaseName) {
      logger.info("No new release found", monitorLabel);
    } else {
      latestRelease = {
        name: version,
        publishedAt,
      };
    }

    logger.info(
      `Latest release updated: ${version} | Published at: ${publishedAt}`,
      monitorLabel,
    );

    const end = Date.now();

    logger.info(`Done. Took ${(end - start) / 1000} seconds`, monitorLabel);
  } catch (e) {
    logger.error(`Error running monitor job: ${e}`, monitorLabel);
    jobStatusEmitter.emit(JobEvent.Failed, {
      status: JobStatus.Failed,
      name: JobKey.Monitor,
      error: JSON.stringify(e),
    });
  }
};

// Called by worker to process Job
export const processReleaseMonitorJob = async (job: any) => {
  await getLatestTaggedRelease();
};
