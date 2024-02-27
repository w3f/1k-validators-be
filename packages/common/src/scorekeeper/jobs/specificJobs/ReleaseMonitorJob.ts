import { logger, queries } from "../../../index";
import { Octokit } from "@octokit/rest";

export const monitorLabel = { label: "Monitor" };

export const getLatestTaggedRelease = async () => {
  try {
    const start = Date.now();

    logger.info(`Running Monitor job`, monitorLabel);

    let latestRelease;
    const ghApi = new Octokit();

    try {
      // Assign the result of ghApi.repos.getLatestRelease() to latestRelease
      const release = await ghApi.repos.getLatestRelease({
        owner: "paritytech",
        repo: "polkadot-sdk",
      });
      latestRelease = release?.data;
    } catch {
      logger.warn("Could not get latest release.", monitorLabel);
    }

    // Check if latestRelease is null or if tag_name and published_at are not present
    if (
      !latestRelease ||
      !latestRelease.tag_name ||
      !latestRelease.published_at
    ) {
      return;
    }

    const { tag_name, published_at } = latestRelease;
    const publishedAt = new Date(published_at).getTime();

    await queries.setRelease(tag_name, publishedAt);

    const taggedReleaseName = latestRelease ? latestRelease?.name : "";
    if (latestRelease && tag_name === taggedReleaseName) {
      logger.info("No new release found", monitorLabel);
    } else {
      latestRelease = {
        name: tag_name.split(`-`)[0],
        publishedAt,
      };
    }

    logger.info(
      `Latest release updated: ${taggedReleaseName} | Published at: ${publishedAt}`,
      monitorLabel,
    );

    const end = Date.now();

    logger.info(`Done. Took ${(end - start) / 1000} seconds`, monitorLabel);
  } catch (e) {
    logger.error(`Error running monitor job: ${e}`, monitorLabel);
  }
};
// Called by worker to process Job
export const processReleaseMonitorJob = async (job: any) => {
  await getLatestTaggedRelease();
};
