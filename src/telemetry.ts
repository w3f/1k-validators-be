import ReconnectingWebSocket from 'reconnecting-websocket';
import WS from 'ws';

import Database from './db';
import logger from './logger';

enum TelemetryMessage {
  FeedVersion   = 0x00,
  BestBlock     = 0x01,
  BestFinalized = 0x02,
  AddedNode     = 0x03,
  RemovedNode   = 0x04,
}

const DEFAULT_HOST = 'ws://localhost:8000/feed';

export default class TelemetryClient {
  private config: any;
  private db: Database;
  private host: string;
  private socket: ReconnectingWebSocket;

  constructor(config: any, db: Database) {
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
        logger.info(
          `Connected to substrate-telemetry on host ${this.host}`
        );
        for (const chain of this.config.telemetry.chains) {
          this._subscribe(chain);
        }
        resolve();
      }

      this.socket.onclose = () => {
        logger.info(
          `Connection to substrate-telemetry on host ${this.host} closed`
        );
        reject();
      }

      this.socket.onerror = (err: any) => {
        logger.info(
          `Could not connect to substrate-telemetry on host ${this.host}: ${err}`
        );
        reject();
      }

      this.socket.onmessage = (msg: any) => {
        const timestamp = new Date().getTime();
        const messages = this._deserialize(msg);
        for (const message of messages) {
          this._handle(message, timestamp);
        }
      }
    });
  }

  private _deserialize(msg: any) {
    const data = JSON.parse(msg.data);
    const messages = new Array(data.length / 2);

    for (const index of messages.keys()) {
      const [ action, payload ] = data.slice(index * 2);
      messages[index] = { action, payload };
    }

    return messages;
  }

  private async _handle(message: any, timestamp: number) {
    const { action, payload } = message;

    switch (action) {
      case TelemetryMessage.AddedNode:
        {
          const [ id, details ] = payload;

          await this.db.reportOnline(id, details);
        }
        break;
      case TelemetryMessage.RemovedNode:
        {
          const id = payload;

          await this.db.reportOffline(id);
        }
        break;
    }
  }

  private async _subscribe(chain: string, finality: boolean = false) {
    if (this.config.telemetry.chains.includes(chain)) {
      this.socket.send(`subscribe:${chain}`);
      logger.info(`Subscribed to ${chain}`);

      if (finality) {
        this.socket.send(`send-finality:${chain}`);
        logger.info('Request finality data');
      }
    }
  }
}