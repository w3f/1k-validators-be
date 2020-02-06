const ReconnectingWebSocket = require('reconnecting-websocket');
const WS = require('ws');

const Actions = {
  FeedVersion      : 0,
  BestBlock        : 0x01,
  BestFinalized    : 2,
  AddedNode        : 3,
  RemovedNode      : 4,
  LocatedNode      : 5,
  ImportedBlock    : 6,
  FinalizedBlock   : 7,
  NodeStats        : 8,
  NodeHardware     : 9,
  TimeSync         : 10,
  AddedChain       : 11,
  RemovedChain     : 12,
  SubscribedTo     : 13,
  UnsubscribedFrom : 14,
  Pong             : 15,
  AfgFinalized         : 16,
  AfgReceivedPrevote   : 17,
  AfgReceivedPrecommit : 18,
  AfgAuthoritySet      : 19
};

const DEFAULT_TELEMETRY_HOST = 'ws://localhost:8000/feed';

class Client {
  constructor(cfg, storage, logger) {
    this.cfg = cfg;
    this.storage = storage;
    this.logger = logger;

    const options = {
      WebSocket: WS, // custom WebSocket constructor
      connectionTimeout: 1000,
      maxRetries: 10,
    };
    this.address = cfg.telemetryHost || DEFAULT_TELEMETRY_HOST;
    this.socket = new ReconnectingWebSocket(this.address, [], options);
    this.timestamps = {};
    this.nodes = {};
  }

  start() {
    return new Promise((resolve, reject) => {
      this.socket.onopen = () => {
        this.logger.info(`Conected to substrate-telemetry on ${this.address}`);
        this.cfg.subscribe.chains.forEach((chain) => {
          this._subscribe(chain);
        });
        resolve();
      };

      this.socket.onclose = () => {
        this.logger.info(`Conection to substrate-telemetry on ${this.address} closed`);
        reject();
      };

      this.socket.onerror = (err) => {
        this.logger.info(`Could not connect to substrate-telemetry on ${this.address}: ${err}`);
        reject();
      };

      this.socket.onmessage = (data) => {
        const currentTimestamp = Date.now();
        const messages = this._deserialize(data);
        for (const message of messages) {
          // this.logger.debug(`New message ${JSON.stringify(message)}`);
          this._handle(message, currentTimestamp);
        }
      };
    });
  }

  _deserialize(msg) {
    const data = JSON.parse(msg.data);

    const messages = new Array(data.length / 2);

    for (const index of messages.keys()) {
      const [ action, payload] = data.slice(index * 2);

      messages[index] = { action, payload };
    }
    return messages;
  }

  _handle(message, currentTimestamp) {
    const { action, payload } = message;

    switch(action) {
    case Actions.AddedChain:
      {
        const chain = payload[0];
        this._subscribe(chain);
      }
      break;

    case Actions.AddedNode:
      {
        const [nodeID, nodeDetails, nodeStats, nodeIO, nodeHardware, blockDetails, location, connectedAt] = payload;
        const [ nodeName, nodeImpl, nodeVersion, nodeAddress, nodeNetworkId ] = nodeDetails;

        // console.log(node)
        this.nodes[nodeID] = nodeName;

        this.storage.updateNode(nodeID, nodeDetails, connectedAt, 0);

        this.logger.info(`New node ${nodeName} (${nodeID})`);
      }
      break;

    case Actions.RemovedNode:
      {
        const nodeID = payload;
        const nodeName = this.nodes[nodeID];

        delete this.nodes[nodeID];

        this.storage.removeNode(nodeID);

        this.logger.info(`Node '${nodeName}' departed`);
      }
      break;

    case Actions.BestBlock:
      {
        const blockNumber = payload[0];

        const productionTime = payload[2] / 1000;

        this.timestamps[blockNumber] = currentTimestamp;

        this.logger.info(`New best block ${blockNumber}`);
      }
      break;

    case Actions.ImportedBlock:
      {
        const blockNumber = payload[1][0];
        const nodeID = payload[0];
        const node = this.nodes[nodeID];

        const propagationTime = payload[1][4] / 1000;

        this.logger.info(`Block ${blockNumber} imported at node ${nodeID}`);
      }
      break;

    case Actions.FinalizedBlock:
      {
        const blockNumber = payload[1];

        this.logger.info(`New finalized block ${blockNumber}`);
      }
      break;

    case Actions.BestFinalized:
      {
        const blockNumber = payload[0];

        const productionTime = this.timestamps[blockNumber];

        if (productionTime) {
          const finalityTime = (currentTimestamp - productionTime) / 1000;
          this.logger.info(`finality time: ${finalityTime}`);

          delete this.timestamps[blockNumber];
        }

        this.logger.info(`New best finalized block ${blockNumber}`);
      }
      break;

    case Actions.AfgReceivedPrevote:
      {
        const address = this._extractAddressFromAfgPayload(payload);

        const name = this._watchedValidatorName(address);
        if(name) {
          this.logger.info(`AfgReceivedPrevote from validator ${name}, address: ${address}`);

        }
      }
      break;

    case Actions.AfgReceivedPrecommit:
      {
        const address = this._extractAddressFromAfgPayload(payload);

        const name = this._watchedValidatorName(address);
        if(name) {
          this.logger.info(`AfgReceivedPrecommit from validator ${name}, address: ${address}`);

        }
      }
      break;
    }
  }

  _watchedValidatorName(address) {
    if(!this.cfg.subscribe ||
       !this.cfg.subscribe.validators ||
       this.cfg.subscribe.validators.length === 0) {
      return '';
    }
    let name = '';
    this.cfg.subscribe.validators.forEach((validator) => {
      if(address === validator.address) {
        name = validator.name;
        return;
      }
    });
    return name;
  }

  _extractAddressFromAfgPayload(payload) {
    return payload[3].replace(/"/g, '');
  }

  _subscribe(chain) {
    if(this.cfg.subscribe.chains.includes(chain)) {
      this.socket.send(`subscribe:${chain}`);
      this.logger.info(`Subscribed to chain '${chain}'`);

      this.socket.send(`send-finality:${chain}`);
      this.logger.info('Requested finality data');
    }
  }
}

module.exports = Client;