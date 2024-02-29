import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "../logger";
import { sleep } from "../utils/util";
import { API_PROVIDER_TIMEOUT, POLKADOT_API_TIMEOUT } from "../constants";

export const apiLabel = { label: "ApiHandler" };

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private _wsProvider?: WsProvider;
  private _api: ApiPromise | null = null;
  private readonly _endpoints: string[] = [];
  static isConnected = false;
  private healthCheckInProgress = false;
  private _currentEndpoint?: string;

  constructor(endpoints: string[]) {
    super();
    this._endpoints = endpoints.sort(() => Math.random() - 0.5);
  }

  async healthCheck(retries = 0): Promise<boolean> {
    if (retries < 50) {
      try {
        logger.info(
          `Performing health check for WS Provider for rpc: ${this._currentEndpoint} try: ${retries}`,
          apiLabel,
        );
        this.healthCheckInProgress = true;
        let chain;

        const isConnected = this._wsProvider?.isConnected;
        if (isConnected) {
          try {
            chain = await this._api?.rpc.system.chain();
          } catch (e) {
            logger.error(`Cannot query chain in health check. ${e}`, apiLabel);
          }
        }

        if (isConnected && chain) {
          logger.info(
            `All good. Connected to ${this._currentEndpoint}`,
            apiLabel,
          );
          this.healthCheckInProgress = false;
          return true;
        } else {
          await sleep(API_PROVIDER_TIMEOUT);
          logger.info(`api still disconnected, disconnecting.`, apiLabel);
          await this._wsProvider?.disconnect();
          await this.getProvider(this._endpoints);
          await this.getAPI();
          return await this.healthCheck(retries++);
        }
      } catch (e: unknown) {
        const errorMessage =
          e instanceof Error ? e.message : "An unknown error occurred";
        logger.error(
          `Error in health check for WS Provider for rpc. ${errorMessage}`,
          apiLabel,
        );
        this.healthCheckInProgress = false;
        return await this.healthCheck(retries++);
      }
    }
    return false;
  }

  public currentEndpoint() {
    return this._currentEndpoint;
  }

  async getProvider(endpoints: string[]): Promise<WsProvider> {
    return await new Promise<WsProvider>((resolve, reject) => {
      const wsProvider = new WsProvider(
        endpoints,
        5000,
        undefined,
        POLKADOT_API_TIMEOUT,
      );

      wsProvider.on("disconnected", async () => {
        logger.warn(
          `WS provider for rpc ${endpoints[0]} disconnected!`,
          apiLabel,
        );
        if (!this.healthCheckInProgress) {
          try {
            const isHealthy = await this.healthCheck();
            logger.info(
              `[Disconnection] ${this._currentEndpoint}} Health check result: ${isHealthy}`,
              apiLabel,
            );
            resolve(wsProvider);
          } catch (error: any) {
            reject(error);
          }
        }
      });
      wsProvider.on("connected", () => {
        logger.info(`WS provider for rpc ${endpoints[0]} connected`, apiLabel);
        this._currentEndpoint = endpoints[0];
        resolve(wsProvider);
      });
      wsProvider.on("error", async () => {
        logger.error(`Error thrown for rpc ${this._endpoints[0]}`, apiLabel);
        if (!this.healthCheckInProgress) {
          try {
            const isHealthy = await this.healthCheck();
            logger.info(
              `[Error] ${this._currentEndpoint} Health check result: ${isHealthy}`,
              apiLabel,
            );
            resolve(wsProvider);
          } catch (error: any) {
            reject(error);
          }
        }
      });
    });
  }

  async getAPI(retries = 0): Promise<ApiPromise> {
    if (this._wsProvider && this._api && this._api?.isConnected) {
      return this._api;
    }
    const endpoints = this._endpoints.sort(() => Math.random() - 0.5);

    try {
      logger.info(
        `[getAPI]: try ${retries} creating provider with endpoint ${endpoints[0]}`,
        apiLabel,
      );
      const provider = await this.getProvider(endpoints);
      this._wsProvider = provider;
      logger.info(
        `[getAPI]: provider created with endpoint: ${endpoints[0]}`,
        apiLabel,
      );
      const api = await ApiPromise.create({
        provider: provider,
        noInitWarn: true,
      });
      await api.isReadyOrError;
      logger.info(`[getApi] Api is ready`, apiLabel);
      return api;
    } catch (e) {
      if (retries < 15) {
        return await this.getAPI(retries + 1);
      } else {
        const provider = await this.getProvider(endpoints);
        return await ApiPromise.create({
          provider: provider,
          noInitWarn: true,
        });
      }
    }
  }

  async setAPI() {
    const api = await this.getAPI(0);
    this._api = api;
    this._registerEventHandlers(this._api);
    return api;
  }

  isConnected(): boolean {
    return this._wsProvider?.isConnected || false;
  }

  getApi(): ApiPromise | null {
    if (!this._api) {
      return null;
    } else {
      return this._api;
    }
  }

  _registerEventHandlers(api: ApiPromise): void {
    if (!api) {
      logger.warn(`API is null, cannot register event handlers.`, apiLabel);
      return;
    }

    logger.info(`Registering event handlers...`, apiLabel);

    api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;

        if (event.section === "session" && event.method === "NewSession") {
          const sessionIndex = Number(event?.data[0]?.toString()) || 0;
          this.handleNewSessionEvent(sessionIndex);
        }

        if (
          event.section === "staking" &&
          (event.method === "Reward" || event.method === "Rewarded")
        ) {
          const [stash, amount] = event.data;
          this.handleRewardEvent(stash.toString(), amount.toString());
        }

        if (event.section === "imOnline" && event.method === "SomeOffline") {
          const data = event.data.toJSON();
          const offlineVals =
            Array.isArray(data) && Array.isArray(data[0])
              ? data[0].reduce((acc: string[], val) => {
                  if (Array.isArray(val) && typeof val[0] === "string") {
                    acc.push(val[0]);
                  }
                  return acc;
                }, [])
              : [];
          this.handleSomeOfflineEvent(offlineVals as string[]);
        }
      });
    });
  }

  handleNewSessionEvent(sessionIndex: number): void {
    this.emit("newSession", { sessionIndex });
  }

  handleRewardEvent(stash: string, amount: string): void {
    this.emit("reward", { stash, amount });
  }

  handleSomeOfflineEvent(offlineVals: string[]): void {
    this.emit("someOffline", { offlineVals });
  }
}

export default ApiHandler;
