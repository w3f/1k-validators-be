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

  public async getLatestTaggedRelease() {
    logger.info("(Monitor::getLatestTaggedRelease) Fetching latest release");

    const tags = await this.ghApi.repos.listTags({
      owner: "paritytech",
      repo: "polkadot",
    });

    const tagName = tags.data[0].name;

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
  }

  /// Ensures that nodes have upgraded within a `grace` period.
  public async ensureUpgrades() {
    // If there is no tagged release stored in state, fetch it now.
    if (!this.latestTaggedRelease) {
      await this.getLatestTaggedRelease();
    }

    const now = new Date().getTime();
    const nodes = await this.db.allNodes();

    for (const node of nodes) {
      const { name, version } = node;

      const nodeVersion = semver.coerce(version);
      const latestVersion = semver.clean(this.latestTaggedRelease.name);
      logger.info(`${name} | version: ${nodeVersion} latest: ${latestVersion}`);

      const isUpgraded = semver.gte(nodeVersion, latestVersion);

      if (isUpgraded && !node.updated) {
        await this.db.reportUpdated(name, now);
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

  public async ensureSentryOnline() {
    const candidates = await this.db.allCandidates();
    const now = new Date().getTime();

    if (!candidates.length) {
      logger.info("(Monitor::ensureSentryOnline) No candidates in DB.");
      return;
    }

    for (const candidate of candidates) {
      const { name, sentryId } = candidate;
      // Sometimes the sentries are in an array if more than one exists.
      // The programme only requires a single to be running.
      if (Array.isArray(sentryId)) {
        let oneOnline = false;
        for (const sId of sentryId) {
          const [foundAndOnline] = await this.db.findSentry(sId);
          if (foundAndOnline) {
            oneOnline = true;
            break;
          }
        }
        if (oneOnline) {
          await this.db.reportSentryOnline(name, now);
        } else {
          await this.db.reportSentryOffline(name, now);
        }
      } else {
        // Just a single sentry to look for.
        const [foundAndOnline] = await this.db.findSentry(sentryId);
        if (foundAndOnline) {
          await this.db.reportSentryOnline(name, now);
        } else {
          await this.db.reportSentryOffline(name, now);
        }
      }
    }
  }
}
