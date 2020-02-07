import { Octokit } from '@octokit/rest';
import semver from 'semver';

import Database from './db';

type TaggedRelease = {
  name: string,
  publishedAt: number,
}

export default class Monitor {
  public grace: number;
  public latestTaggedRelease: TaggedRelease|null = null;
  
  private db: Database;
  private ghApi: Octokit;
  

  constructor(db: Database, grace: number) {
    this.db = db;
    this.grace = grace;
    this.ghApi = new Octokit();
  }

  public async getLatestTaggedRelease() {
    const tags = await this.ghApi.repos.listTags({
      owner: 'paritytech',
      repo: 'polkadot',
    });
    
    const release = await this.ghApi.repos.getReleaseByTag({
      owner: 'paritytech',
      repo: 'polkadot',
      tag: tags.data[0].name,
    });

    const publishedAt = new Date(release.data.published_at).getTime();

    this.latestTaggedRelease = {
      name: tags.data[0].name,
      publishedAt,
    };
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
      const nodeVersion = semver.coerce(node.details[2]);
      const latestVersion = semver.clean(this.latestTaggedRelease!.name);

      const isUpgraded = semver.gte(nodeVersion!, latestVersion!);

      if (isUpgraded) {
        // The node is doing good. We reset the `goodSince` if it's been
        // previously set to 0.
        if (Number(node.goodSince) === 0) {
          await this.db.nodeGood(node.id, now);
        }
      } else {
        // The node is doing bad. Let's check it against the grace period
        // and set its `goodSince` to 0 if it's overdue.
        if (now > this.latestTaggedRelease!.publishedAt + this.grace) {
          await this.db.nodeNotGood(node.id);
        }
      }
    }
  }
}