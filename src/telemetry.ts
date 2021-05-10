import ReconnectingWebSocket from "reconnecting-websocket";
import WS from "ws";

import { Config } from "./config";
import Database from "./db";
import logger from "./logger";

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
  private config: Config;
  private db: Database;
  private host: string;
  private socket: ReconnectingWebSocket;
  // map of name -> boolean
  private beingReported: Map<string, boolean> = new Map();

  constructor(config: Config, db: Database) {
    this.config = config;
    this.db = db;
    this.host = this.config.telemetry.host || DEFAULT_HOST;

    const options = {
      WebSocket: WS,
      connectionTimeout: 1000,
      maxRetries: 10,
    };

    this.socket = new ReconnectingWebSocket(this.host, [], options);
  }

  async start(): Promise<null> {
    return new Promise((resolve: any, reject: any) => {
      this.socket.onopen = () => {
        logger.info(`Connected to substrate-telemetry on host ${this.host}`);
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
          `Could not connect to substrate-telemetry on host ${
            this.host
          }: ${err.toString()}`
        );
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

    switch (action) {
      case TelemetryMessage.AddedNode:
        {
          const [id, details] = payload;
          const now = Date.now();

          MemNodes[parseInt(id)] = details;

          // a mutex that will only update after its free to avoid race conditions
          const waitUntilFree = async (name: string): Promise<void> => {
            if (this.beingReported.get(name)) {
              return new Promise((resolve) => {
                const intervalId = setInterval(() => {
                  if (!this.beingReported.get(name)) {
                    clearInterval(intervalId);
                    resolve();
                  }
                }, 1000);
              });
            }
          };

          await waitUntilFree(details[0]);
          await this.db.reportOnline(id, details, now);
        }
        break;
      case TelemetryMessage.RemovedNode:
        {
          const id = parseInt(payload);
          const now = Date.now();

          //this is to get around security warning vvv
          const details = MemNodes[parseInt(String(id))];

          if (!details) {
            logger.info(`Unknown node with ${id} reported offline.`);
          }

          const name = details[0];

          logger.info(`(TELEMETRY) Reporting ${name} OFFLINE`);
          this.beingReported.set(name, true);
          await this.db.reportOffline(id, name, now);
          this.beingReported.set(name, false);
        }
        break;
      case TelemetryMessage.ImportedBlock:
        {
          const [id, details] = payload;
          const now = Date.now();

          MemNodes[parseInt(id)] = details;

          // a mutex that will only update after its free to avoid race conditions
          const waitUntilFree = async (name: string): Promise<void> => {
            if (this.beingReported.get(name)) {
              return new Promise((resolve) => {
                const intervalId = setInterval(() => {
                  if (!this.beingReported.get(name)) {
                    clearInterval(intervalId);
                    resolve();
                  }
                }, 1000);
              });
            }
          };

          await waitUntilFree(details[0]);
          await this.db.reportBestBlock(id, details, now);
        }
        break;
    }
  }

  private async _subscribe(chain: string, finality = false) {
    if (this.config.telemetry.chains.includes(chain)) {
      this.socket.send(`subscribe:${chain}`);
      logger.info(`Subscribed to ${chain}`);

      if (finality) {
        this.socket.send(`send-finality:${chain}`);
        logger.info("Request finality data");
      }
    }
  }
}
