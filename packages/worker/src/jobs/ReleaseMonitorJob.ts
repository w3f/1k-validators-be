import { logger, queries } from "@1kv/common";
import { Octokit } from "@octokit/rest";

export const monitorLabel = { label: "Monitor" };

export const getLatestTaggedRelease = async () => {
  try {
    const start = Date.now();

    logger.info(`Running Monitor job`, monitorLabel);

    let latestRelease, latestTaggedRelease;
    const ghApi = new Octokit();

    try {
      latestRelease = await this.ghApi.repos.getLatestRelease({
        owner: "paritytech",
        repo: "polkadot-sdk",
      });
    } catch {
      logger.warn("Could not get latest release.", monitorLabel);
    }
    if (!latestRelease) return;
    const { tag_name, published_at } = latestRelease.data;
    const publishedAt = new Date(published_at).getTime();

    await queries.setRelease(tag_name, publishedAt);

    if (latestTaggedRelease && tag_name === latestTaggedRelease?.name) {
      logger.info("No new release found", monitorLabel);
    } else {
      latestTaggedRelease = {
        name: tag_name.split(`-`)[0],
        publishedAt,
      };
    }

    logger.info(
      `Latest release updated: ${latestTaggedRelease.name} | Published at: ${publishedAt}`,
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
