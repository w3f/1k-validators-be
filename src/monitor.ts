import { Octokit } from "@octokit/rest";
import semver from "semver";

import Database from "./db";
import logger from "./logger";

type TaggedRelease = {
  name: string;
  publishedAt: number;
};

export default class Monitor {
  public grace: number;
  public latestTaggedRelease: TaggedRelease | null = null;

  private db: Database;
  private ghApi: any;

  constructor(db: Database, grace: number) {
    this.db = db;
    this.grace = grace;
    this.ghApi = new Octokit();
  }

  public async getLatestTaggedRelease(): Promise<TaggedRelease> {
    logger.info("(Monitor::getLatestTaggedRelease) Fetching latest release");

    const tags = await this.ghApi.repos.listTags({
      owner: "paritytech",
      repo: "polkadot",
    });

    const lastKusamaRelease = tags.data.find((tag: any) => {
      return semver.coerce(tag.name).minor === 7;
    });

    const tagName = lastKusamaRelease.name;

    if (
      this.latestTaggedRelease &&
      tagName === this.latestTaggedRelease!.name
    ) {
      logger.info("(Monitor::getLatestTaggedRelease) No new release found");
      return;
    }

    const release = await this.ghApi.repos.getReleaseByTag({
      owner: "paritytech",
      repo: "polkadot",
      tag: tagName,
    });

    const publishedAt = new Date(release.data.published_at).getTime();

    this.latestTaggedRelease = {
      name: tagName,
      publishedAt,
    };

    logger.info(
      `Latest release updated: ${tagName} | Published at: ${publishedAt}`
    );

    return this.latestTaggedRelease;
  }

  /// Ensures that nodes have upgraded within a `grace` period.
  public async ensureUpgrades() : Promise<void> {
    // If there is no tagged release stored in state, fetch it now.
    if (!this.latestTaggedRelease) {
      await this.getLatestTaggedRelease();
    }

    const now = new Date().getTime();
    const nodes = await this.db.allNodes();

    for (const node of nodes) {
      const { name, version, updated } = node;

      const nodeVersion = semver.coerce(version);
      const latestVersion = semver.clean(this.latestTaggedRelease.name);
      logger.info(`${name} | version: ${nodeVersion} latest: ${latestVersion}`);

      const isUpgraded = semver.gte(nodeVersion, latestVersion);

      if (isUpgraded) {
        if (!updated) {
          await this.db.reportUpdated(name, now);
        }
        continue;
      }

      if (now < this.latestTaggedRelease.publishedAt + this.grace) {
        // Still in grace, but check if the node is only one patch version away.
        const incremented = semver.inc(nodeVersion, "patch");
        if (semver.gte(incremented, latestVersion)) {
          await this.db.reportUpdated(name, now);
          continue;
        }
      }

      await this.db.reportNotUpdated(name);
    }
  }
}
