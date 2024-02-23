import WebSocket from "ws";

import { Config, Constants, logger, queries, Util } from "@1kv/common";
import { registerTelemetryWs } from "./Telemetry/TelemetryWS";
import { initIIT } from "@1kv/common/build/utils";

export default class TelemetryClient {
  private _chains: string[];
  private config: Config.ConfigSchema;
  private _host: string;
  private _socket: WebSocket;
  // map of name -> boolean
  private beingReported: Map<string, boolean> = new Map();

  // Nodes that may be disconnected but aren't necessarily offline
  private _disconnectedNodes: Map<string, number> = new Map();

  // map of name -> the time of being offline
  private _offlineNodes: Map<string, number> = new Map();

  private enable = true;

  private _memNodes = {};

  constructor(config: Config.ConfigSchema) {
    this.config = config;
    this._host =
      this.config.telemetry.host || Constants.DEFAULT_TELEMETRY_ENDPONT;

    this.enable = config.telemetry.enable;

    if (!this.enable) {
      logger.warn("Telemetry Client not enabled.", {
        label: "Telemetry",
      });
    }

    this._chains = this.config?.telemetry?.chains;
    this._memNodes = {};
  }

  public initializeWebSocket() {
    try {
      this._socket = new WebSocket(this._host);
      this._socket.on("error", (err) => {
        // Handle asynchronous errors here
        logger.error(`WebSocket error: ${err}`, {
          label: "Telemetry",
        });
      });

      this._socket.on("open", (event) => {
        logger.info("WebSocket connection established", {
          label: "Telemetry",
        });
        // Handle the open event, e.g., by setting up subscriptions
      });

      this._socket.on("close", (event) => {
        logger.info(`WebSocket connection closed: ${event}`, {
          label: "Telemetry",
        });
        // Handle the close event, possibly by attempting to reconnect
      });
    } catch (e) {
      logger.error(`Error initializing telemetry websocket: ${e}`, {
        label: "Telemetry",
      });
    }
  }

  get host(): string {
    return this._host;
  }

  get chains(): string[] {
    return this._chains;
  }

  get disconnectedNodes(): Map<string, number> {
    return this._disconnectedNodes;
  }

  get offlineNodes(): Map<string, number> {
    return this._offlineNodes;
  }

  get memNodes(): any {
    return this._memNodes;
  }

  get socket(): WebSocket {
    return this._socket;
  }

  async start(retries = 0): Promise<void> {
    // while (!isOpen(this.socket)) {
    //   logger.info("Waiting for telemetry connection to open", {
    //     label: "Telemetry",
    //   });
    //   await Util.sleep(1000);
    // }
    // if (isOpen(this.socket)) {
    //   logger.info("Telemetry connection opened", { label: "Telemetry" });
    // }
    const maxRetries = 5;
    if (!this.enable) {
      logger.warn("Telemetry Client not enabled.", { label: "Telemetry" });
      return;
    }

    if (retries >= maxRetries) {
      logger.error("Maximum retry attempts reached, giving up", {
        label: "Telemetry",
      });
      return;
    }

    try {
      await registerTelemetryWs(this);
      await initIIT(this.config?.telemetry?.ipinfoToken);
    } catch (error) {
      logger.error(`Telemetry connection error: ${error}`, {
        label: "Telemetry",
      });
      const retryDelay = Math.pow(2, retries) * 1000; // Exponential backoff
      await Util.sleep(retryDelay);
      await this.start(retries + 1);
    }
  }

  public async reconnect(retries = 0): Promise<void> {
    const maxRetries = 5; // Maximum number of retry attempts
    const retryDelayBase = 2000; // Base delay time in ms (2 seconds)

    if (retries >= maxRetries) {
      logger.error("Maximum retry attempts reached, giving up", {
        label: "Telemetry",
      });
      return;
    }

    const retryDelay = retryDelayBase * Math.pow(2, retries); // Exponential backoff
    logger.info(`Retrying connection in ${retryDelay}ms`, {
      label: "Telemetry",
    });
    // await Util.sleep(retryDelay);

    try {
      await this.start(0);
    } catch (e) {
      logger.error(`Telemetry error on retry: ${e}`, { label: "Telemetry" });
      await this.reconnect(retries + 1);
    }
  }

  public async checkOffline() {
    for (const [name, disconnectedAt] of this.disconnectedNodes.entries()) {
      if (Date.now() - disconnectedAt > Constants.FIVE_MINUTES) {
        this.disconnectedNodes.delete(name);
        logger.warn(`${name} has been disconnected for more than 5 minutes`, {
          label: "Telemetry",
        });
        await queries.reportOffline(name);
        this.offlineNodes.set(name, disconnectedAt);
      }
    }
  }
}
