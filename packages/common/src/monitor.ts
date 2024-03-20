import { Octokit } from "@octokit/rest";
import semver from "semver";

import { logger, queries } from "./index";

type TaggedRelease = {
  name: string;
  publishedAt: number;
};

export default class Monitor {
  public grace: number;
  public latestTaggedRelease: TaggedRelease | null = null;

  private ghApi: any;

  constructor(grace: number) {
    this.grace = grace;
    this.ghApi = new Octokit();
  }

  public async getLatestTaggedRelease(): Promise<TaggedRelease | null> {
    logger.info("(Monitor::getLatestTaggedRelease) Fetching latest release");
    let latestRelease;

    try {
      latestRelease = await this.ghApi.repos.getLatestRelease({
        owner: "paritytech",
        repo: "polkadot-sdk",
      });
    } catch (e) {
      logger.info(JSON.stringify(e));
      logger.info(
        "{Monitor::getLatestTaggedRelease} Could not get latest release.",
      );
    }

    if (!latestRelease) return null;
    const { tag_name, published_at } = latestRelease.data;
    const publishedAt = new Date(published_at).getTime();

    const tagParts = tag_name.split("-");
    const version = tagParts[tagParts.length - 1];

    await queries.setRelease(version, publishedAt);

    if (
      this.latestTaggedRelease &&
      version === this.latestTaggedRelease!.name
    ) {
      logger.info("(Monitor::getLatestTaggedRelease) No new release found");
      return null;
    }

    this.latestTaggedRelease = {
      name: version,
      publishedAt,
    };

    logger.info(
      `(Monitor::getLatestTaggedRelease) Latest release updated: ${version} | Published at: ${publishedAt}`,
    );

    return this.latestTaggedRelease;
  }

  /// Ensures that nodes have upgraded within a `grace` period.
  public async ensureUpgrades(): Promise<void> {
    // If there is no tagged release stored in state, fetch it now.
    if (!this.latestTaggedRelease) {
      await this.getLatestTaggedRelease();
    }

    const now = new Date().getTime();
    const nodes = await queries.allCandidates();

    for (const node of nodes) {
      const { name, version, updated } = node;

      const nodeVersion = semver.coerce(version);
      const latestVersion = semver.clean(
        this.latestTaggedRelease?.name?.split(`-`)[0] || "",
      );
      if (latestVersion && nodeVersion) {
        logger.debug(
          `(Monitor::ensureUpgrades) ${name} | version: ${nodeVersion} latest: ${latestVersion}`,
        );

        if (!nodeVersion) {
          if (updated) {
            await queries.reportNotUpdated(name);
          }
          continue;
        }

        const isUpgraded = semver.gte(nodeVersion, latestVersion);

        if (isUpgraded) {
          if (!updated) {
            await queries.reportUpdated(name);
          }
          continue;
        }

        const published = this.latestTaggedRelease?.publishedAt || 0;
        if (now < published + this.grace) {
          // Still in grace, but check if the node is only one patch version away.
          const incremented = semver.inc(nodeVersion, "patch") || "";
          if (semver.gte(incremented, latestVersion)) {
            await queries.reportUpdated(name);
            continue;
          }
        }

        await queries.reportNotUpdated(name);
      }
    }
  }
}
