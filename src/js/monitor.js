const { Octokit } = require('@octokit/rest');
const semver = require('semver');

const { HOUR } = require('./constants');

class NodeMonitor {
  constructor(storage) {
    this.storage = storage;
    this.ghApi = new Octokit();
  }

  /// Checks uptime and upgrade requirements.
  async getLatestTag() {
    const tags = await this.ghApi.repos.listTags({
      owner: 'paritytech',
      repo: 'polkadot'
    });
    const release = await this.ghApi.repos.getReleaseByTag({
      owner: 'paritytech',
      repo: 'polkadot',
      tag: tags.data[0].name,
    });
    const publishedAt = new Date(release.data.published_at).getTime();
    this.latestVersion = {
      name: tags.data[0].name,
      publishedAt,
    };
  }

  async checkNodesVersion() {
    const now = new Date().getTime();
    const nodes = this.storage.getNodes();
    // console.log(nodes);
    for (const node of nodes) {
      const version = semver.coerce(node.nodeDetails[2]);
      const latestVersion = semver.clean(this.latestVersion.name);

      const isUpgraded = semver.gte(version, latestVersion);

      if (!isUpgraded) {
        // TODO change this constant to a config value.
        if (now > this.latestVersion.publishedAt + 16*HOUR) {
          /// The node is out of date.
          this.storage.updateNode(
            node.id,
            node.nodeDetails,
            node.connectedAt,
            node.nominatedAt,
            0,
            node.rank,
          );
        }
      } else {
        /// The node is doing good! Let's check if we should change its status back.
        if (node.goodSince < 2) {
          this.storage.updateNode(
            node.id,
            node.nodeDetails,
            node.connectedAt,
            node.nominatedAt,
            now,
            node.rank
          );
        }
      }
    }
  }
}

module.exports = NodeMonitor;
