import ReconnectingWebSocket from "reconnecting-websocket";
import WS from "ws";

import { queries, Config, logger } from "@1kv/common";

enum TelemetryMessage {
  FeedVersion = 0x00,
  BestBlock = 0x01,
  BestFinalized = 0x02,
  AddedNode = 0x03,
  RemovedNode = 0x04,
  LocatedNode = 0x05,
  ImportedBlock = 0x06,
  FinalizedBlock = 0x07,
  NodeStats = 0x08,
  NodeHardware = 0x09,
  TimeSync = 0x10,
}

const DEFAULT_HOST = "ws://localhost:8000/feed";

const MemNodes = {};

export default class TelemetryClient {
  private config: Config.ConfigSchema;
  private host: string;
  private socket: ReconnectingWebSocket;
  // map of name -> boolean
  private beingReported: Map<string, boolean> = new Map();

  // Nodes that may be disconnected but aren't necessarily offline
  private disconnectedNodes: Map<string, number> = new Map();

  // map of name -> the time of being offline
  private offlineNodes: Map<string, number> = new Map();

  private enable = true;

  constructor(config: Config.ConfigSchema) {
    this.config = config;
    this.host = this.config.telemetry.host || DEFAULT_HOST;

    this.enable = config.telemetry.enable;

    const options = {
      WebSocket: WS,
      connectionTimeout: 10000,
      maxRetries: 15,
    };

    this.socket = new ReconnectingWebSocket(this.host, [], options);
  }

  async start(): Promise<any> {
    if (!this.enable) {
      logger.info("Telemetry Client not enabled.");
      return;
    } else {
      return new Promise((resolve: any, reject: any) => {
        this.socket.onopen = () => {
          logger.info(`Connected to substrate-telemetry on host ${this.host}`, {
            label: "Telemetry",
          });
          for (const chain of this.config.telemetry.chains) {
            this._subscribe(chain);
          }
          resolve();
        };

        this.socket.onclose = () => {
          logger.info(
            `Connection to substrate-telemetry on host ${this.host} closed`
          );
          reject();
        };

        this.socket.onerror = (err: any) => {
          logger.info(
            `Could not connect to substrate-telemetry on host ${this.host}: `
          );
          logger.info(err);
          reject();
        };

        this.socket.onmessage = (msg: any) => {
          const messages = this._deserialize(msg);
          for (const message of messages) {
            this._handle(message);
          }
        };
      });
    }
  }

  private _deserialize(msg: any) {
    const data = JSON.parse(msg.data);
    const messages = new Array(data.length / 2);

    for (const index of messages.keys()) {
      const [action, payload] = data.slice(index * 2);
      // eslint-disable-next-line security/detect-object-injection
      messages[index] = { action, payload };
    }

    return messages;
  }

  private async _handle(message: any) {
    const { action, payload } = message;

    if (this.disconnectedNodes.size > 0) {
      await this.checkOffline();
    }

    switch (action) {
      case TelemetryMessage.FeedVersion:
        {
          logger.info(`feed version: ${JSON.stringify(payload)}`);
        }
        break;
      case TelemetryMessage.AddedNode:
        {
          const [
            id,
            details,
            nodeStats,
            nodeIO,
            nodeHardware,
            blockDetails,
            location,
            startupTime,
          ] = payload;

          const now = Date.now();

          // Cache the node details, key'd by telemetry id
          MemNodes[parseInt(id)] = details;
          const name = details[0];

          logger.warn(`node ${details[0]} with id: ${id} is  online`, {
            label: "Telemetry",
          });

          // a mutex that will only update after its free to avoid race conditions
          // const waitUntilFree = async (name: string): Promise<void> => {
          //   if (this.beingReported.get(name)) {
          //     return new Promise((resolve) => {
          //       const intervalId = setInterval(() => {
          //         if (!this.beingReported.get(name)) {
          //           clearInterval(intervalId);
          //           resolve();
          //         }
          //       }, 1000);
          //     });
          //   }
          // };

          // await waitUntilFree(details[0]);

          // Report the node as online
          await queries.reportOnline(id, details, now, startupTime);

          // If the node was offline
          const wasOffline = this.offlineNodes.has(name);
          if (wasOffline) {
            const offlineAt = this.offlineNodes.get(name);
            const offlineTime = now - offlineAt;
            this.offlineNodes.delete(name);
            logger.warn(
              `node ${name} id: ${id} that was offline is now online. Offline time: ${
                offlineTime / 1000 / 60
              } minutes `,
              {
                label: "Telemetry",
              }
            );
          }
          const wasDisconnected = this.disconnectedNodes.has(name);
          if (wasDisconnected) {
            const disconnectedAt = this.disconnectedNodes.get(name);
            const disconnectedTime = now - disconnectedAt;
            this.disconnectedNodes.delete(name);
            logger.warn(
              `node ${name} id: ${id} that was disconnected is now online. Disconnection time: ${
                disconnectedTime / 1000 / 60
              } minutes`,
              {
                label: "Telemetry",
              }
            );
          }
        }
        break;
      case TelemetryMessage.RemovedNode:
        {
          const id = parseInt(payload);
          const now = Date.now();

          //this is to get around security warning vvv
          const details = MemNodes[id];

          // remove from cache
          MemNodes[id] = null;

          if (!details) {
            logger.info(`Unknown node with ${id} reported offline.`);
            break;
          }

          const name = details[0];

          // this.beingReported.set(name, true);
          // await queries.reportOffline(id, name, now);
          // this.beingReported.set(name, false);

          logger.warn(`setting disconnection ${name} id: ${id} at ${now}`, {
            label: "Telemetry",
          });
          this.disconnectedNodes.set(name, now);
          logger.warn(JSON.stringify([...this.disconnectedNodes.entries()]), {
            label: "Telemetry",
          });
        }
        break;
      case TelemetryMessage.LocatedNode:
        {
          const [id, lat, lon, city] = payload;
          // await this.db.setLocation(id, city);
        }
        break;
      case TelemetryMessage.ImportedBlock:
        {
          const [id, blockDetails] = payload;
          const now = Date.now();

          const mem = MemNodes[id];
          if (!mem) {
            logger.warn(`id: ${id} is not cached`, { label: "Telemetry" });
            break;
          }
          const name = mem[0];

          const wasOffline = this.offlineNodes.has(name);
          if (wasOffline) {
            const offlineAt = this.offlineNodes.get(name);
            const offlineTime = now - offlineAt;
            this.offlineNodes.delete(name);
            logger.warn(
              `node ${name} id: ${id} that was offline has a new block. Offline time: ${
                offlineTime / 1000 / 60
              } minutes `,
              {
                label: "Telemetry",
              }
            );
          }
          const wasDisconnected = this.disconnectedNodes.has(name);
          if (wasDisconnected) {
            const disconnectedAt = this.disconnectedNodes.get(name);
            const disconnectedTime = now - disconnectedAt;
            this.disconnectedNodes.delete(name);
            logger.warn(
              `node ${name} id: ${id} that was disconnected has a new block. Disconnection time: ${
                disconnectedTime / 1000 / 60
              } minutes`,
              {
                label: "Telemetry",
              }
            );
          }
        }
        break;
    }
  }

  private async _subscribe(chain: string, finality = true) {
    if (this.config.telemetry.chains.includes(chain)) {
      this.socket.send(`ping:${chain}`);
      this.socket.send(`subscribe:${chain}`);
      logger.info(`Subscribed to ${chain}`);
    }
  }

  private async checkOffline() {
    const now = Date.now();
    const FIVE_MINUTES = 300000;
    for (const [name, disconnectedAt] of this.disconnectedNodes.entries()) {
      if (now - disconnectedAt > FIVE_MINUTES) {
        this.disconnectedNodes.delete(name);
        logger.warn(`${name} has been disconnected for more than 5 minutes`, {
          label: "Telemetry",
        });
        await queries.reportOffline(name, now);
        this.offlineNodes.set(name, disconnectedAt);
      }
    }
  }
}
