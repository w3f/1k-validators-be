import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "../logger";
import { POLKADOT_API_TIMEOUT } from "../constants";
import { sleep } from "../utils";

export const apiLabel = { label: "ApiHandler" };

class ApiHandler extends EventEmitter {
  private _wsProvider?: WsProvider;
  private _api: ApiPromise | null = null;
  private readonly _endpoints: string[];
  private _currentEndpointIndex = 0;
  private _maxRetries = 25;
  private _connectionAttemptInProgress = false;
  private healthCheckInProgress = false;
  public upSince: number = Date.now();

  constructor(endpoints: string[]) {
    super();
    this._endpoints = endpoints;
    this.initiateConnection().catch(this.handleError);
  }

  public async initiateConnection(retryCount = 0): Promise<void> {
    logger.info(`Initiating connection...`, apiLabel);
    if (this._connectionAttemptInProgress) {
      logger.info(
        "Connection attempt already in progress, skipping new attempt.",
        apiLabel,
      );
      return;
    }

    logger.info(
      `Setting connection attempt in progress. Endpoints: ${this._endpoints}`,
      apiLabel,
    );
    this._connectionAttemptInProgress = true;
    const endpoint = this.currentEndpoint();
    logger.info(`Attempting to connect to endpoint: ${endpoint}`, apiLabel);

    this._wsProvider = new WsProvider(endpoint, POLKADOT_API_TIMEOUT);

    this._wsProvider.on("error", async (error) => {
      logger.error(
        `WS provider error at ${endpoint}: ${error.message}`,
        apiLabel,
      );
      await this.retryConnection();
    });

    this._wsProvider.on("disconnected", async () => {
      logger.info(`WS provider disconnected from ${endpoint}`, apiLabel);
      await this.retryConnection();
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
      await this.retryConnection();
    } finally {
      this._connectionAttemptInProgress = false;
    }
  }

  private async retryConnection(): Promise<void> {
    if (!this.isConnected() && this._maxRetries > 0) {
      this._maxRetries--;
      await this.cleanupConnection();
      this.moveToNextEndpoint();
      await this.initiateConnection();
    }
  }

  private moveToNextEndpoint(): void {
    this._currentEndpointIndex =
      (this._currentEndpointIndex + 1) % this._endpoints.length;
  }

  private async cleanupConnection(): Promise<void> {
    try {
      if (this._wsProvider) {
        this._wsProvider?.disconnect();
        this._wsProvider = undefined;
      }
      await this._api?.disconnect();
      this._api = null;
      this._connectionAttemptInProgress = false;
      logger.info(`Connection cleaned up`, apiLabel);
      await sleep(3000);
    } catch (error) {
      logger.error(`Error cleaning up connection: ${error}`, apiLabel);
    }
  }

  async healthCheck(): Promise<boolean> {
    logger.debug(
      `Performing health check... endpoint: ${this.currentEndpoint()}`,
      apiLabel,
    );
    const wsConnected = this._wsProvider?.isConnected || false;
    const apiConnected = this._api?.isConnected || false;
    const chain = await this._api?.rpc.system.chain();

    this.healthCheckInProgress = false;
    const healthy = wsConnected && apiConnected && !!chain;
    logger.info(`Health: ${healthy}`, apiLabel);
    return healthy;
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
