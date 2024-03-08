import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "../logger";
import { sleep } from "../utils/util";
import { API_PROVIDER_TIMEOUT, POLKADOT_API_TIMEOUT } from "../constants";

export const apiLabel = { label: "ApiHandler" };

class ApiHandler extends EventEmitter {
  private _wsProvider?: WsProvider;
  private _api: ApiPromise | null = null;
  private readonly _endpoints: string[];
  private _currentEndpointIndex = 0;
  private readonly _maxRetries = 25;
  private _connectionAttemptInProgress = false;
  private healthCheckInProgress = false;
  public upSince: number = Date.now();

  constructor(endpoints: string[]) {
    super();
    this._endpoints = endpoints;
    this.initiateConnection().catch(this.handleError);
  }

  public async initiateConnection(retryCount = 0): Promise<void> {
    if (this._connectionAttemptInProgress) {
      logger.info(
        "Connection attempt already in progress, skipping new attempt.",
        apiLabel,
      );
      return;
    }

    this._connectionAttemptInProgress = true;
    const endpoint = this._endpoints[this._currentEndpointIndex];
    logger.info(`Attempting to connect to endpoint: ${endpoint}`, apiLabel);

    this._wsProvider = new WsProvider(endpoint, POLKADOT_API_TIMEOUT);

    this._wsProvider.on("error", (error) => {
      logger.error(
        `WS provider error at ${endpoint}: ${error.message}`,
        apiLabel,
      );
    });

    this._wsProvider.on("disconnected", () => {
      logger.info(`WS provider disconnected from ${endpoint}`, apiLabel);
    });

    try {
      const api = await ApiPromise.create({ provider: this._wsProvider });
      await api.isReadyOrError;
      this._api = api;
      this._registerEventHandlers(api);
      logger.info(`Successfully connected to ${endpoint}`, apiLabel);
      this.emit("connected", { endpoint: endpoint });
      this.upSince = Date.now();
    } catch (error) {
      logger.error(
        `Connection failed to endpoint ${endpoint}: ${error}`,
        apiLabel,
      );

      if (retryCount < this._maxRetries) {
        await this.cleanupConnection();
        await sleep(API_PROVIDER_TIMEOUT);
        await this.initiateConnection(retryCount + 1);
      } else {
        throw new Error(`Unable to connect after ${this._maxRetries} retries.`);
      }
    } finally {
      this._connectionAttemptInProgress = false;
    }
  }

  private async cleanupConnection(): Promise<void> {
    try {
      if (this._wsProvider) {
        await this._wsProvider.disconnect();
        this._wsProvider = undefined;
      }
      this._api = null;
    } catch (error) {
      logger.error(`Error cleaning up connection: ${error}`, apiLabel);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this.healthCheckInProgress) return false;
    this.healthCheckInProgress = true;

    try {
      const wsConnected = this._wsProvider?.isConnected || false;
      const apiConnected = this._api?.isConnected || false;
      const chain = await this._api?.rpc.system.chain();

      this.healthCheckInProgress = false;
      return wsConnected && apiConnected && !!chain;
    } catch (error) {
      logger.error(`Health check failed: ${error}`, apiLabel);
      this.healthCheckInProgress = false;
      await this.cleanupConnection();
      await this.initiateConnection().catch(this.handleError);
      return false;
    }
  }

  currentEndpoint(): string {
    return this._endpoints[this._currentEndpointIndex];
  }

  getApi(): ApiPromise | null {
    return this._api;
  }

  isConnected(): boolean {
    return !!this._wsProvider?.isConnected && !!this._api?.isConnected;
  }

  _registerEventHandlers(api: ApiPromise): void {
    api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (event.section === "session" && event.method === "NewSession") {
          const sessionIndex = Number(event?.data[0]?.toString()) || 0;
          this.emit("newSession", sessionIndex);
        }
      });
    });
  }

  private handleError(error): void {
    logger.error(`Unhandled exception in ApiHandler: ${error}`, apiLabel);
  }
}

export default ApiHandler;
