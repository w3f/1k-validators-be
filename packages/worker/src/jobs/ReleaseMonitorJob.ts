import { Db, logger } from "@1kv/common";
import { Octokit } from "@octokit/rest";

export const getLatestTaggedRelease = async (db: Db) => {
  const start = Date.now();

  logger.info(`(cron::Monitor::start) Running Monitor job`);

  let latestRelease, latestTaggedRelease;
  const ghApi = new Octokit();

  try {
    latestRelease = await ghApi.repos.getLatestRelease({
      owner: "paritytech",
      repo: "polkadot",
    });
  } catch {
    logger.info(
      "{Monitor::getLatestTaggedRelease} Could not get latest release."
    );
  }
  if (!latestRelease) return;
  const { tag_name, published_at } = latestRelease.data;
  const publishedAt = new Date(published_at).getTime();

  await db.setRelease(tag_name, publishedAt);

  if (latestTaggedRelease && tag_name === latestTaggedRelease?.name) {
    logger.info("(Monitor::getLatestTaggedRelease) No new release found");
  } else {
    latestTaggedRelease = {
      name: tag_name.split(`-`)[0],
      publishedAt,
    };
  }

  logger.info(
    `(Monitor::getLatestTaggedRelease) Latest release updated: ${latestTaggedRelease.name} | Published at: ${publishedAt}`
  );

  const end = Date.now();

  logger.info(
    `{cron::Monitor::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

// Called by worker to process Job
export const processReleaseMonitorJob = async (job: any, db: Db) => {
  await getLatestTaggedRelease(db);
};
