const NodeMonitor = require('../src/monitor');

class MockStorage {
  constructor() {
    this.nodes = [
      {
        id: 0,
        nodeDetails: [
          '', '', '0.7.20-xxxxxxxxxxxxxx'
        ],
        connectedAt: 0,
        nominatedAt: 0,
        goodSince: 1,
        rank: 0
      },
      {
        id: 1,
        nodeDetails: [
          '', '', '0.7.19-xxxxxxxxxxxxxx'
        ],
        connectedAt: 0,
        nominatedAt: 0,
        goodSince: 1,
        rank: 0
      },
    ];
  }

  getNodes() {
    return this.nodes;
  }

  updateNode(id, nodeDetails, connectedAt, nominatedAt, goodSince, rank) {
    this.nodes.forEach((node, index) => {
      if (node.id == id) {
        this.nodes[index] = {
          id,
          nodeDetails,
          connectedAt,
          nominatedAt,
          goodSince,
          rank,
        };
      }
    });
  }
}

const main = async () => {
  const storage = new MockStorage();
  const monitor = new NodeMonitor(storage);
  const tags = await monitor.getLatestTag();
  await monitor.checkNodesVersion();
  console.log(storage.getNodes());
  await monitor.getLatestTag();
  await monitor.checkNodesVersion();
  console.log(storage.getNodes());
};

main();