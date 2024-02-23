import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "./logger";
import { sleep } from "./utils/util";
import { POLKADOT_API_TIMEOUT } from "./constants";

export const apiLabel = { label: "ApiHandler" };

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private _wsProvider: WsProvider;
  private _api: ApiPromise;
  private _endpoints: string[];
  private _reconnectLock: boolean;
  private _reconnectTries = 0;
  static isConnected: any;
  static _reconnect: any;

  timeout = 5 * 1000;

  private healthCheckInProgress: boolean;
  private _currentEndpoint: string;
  constructor(endpoints?: string[]) {
    super();
    this._endpoints = endpoints.sort(() => Math.random() - 0.5);
  }

  async healthCheck() {
    try {
      logger.info(
        `Performing health check for WS Provider for rpc: ${this._currentEndpoint}`,
        apiLabel,
      );
      this.healthCheckInProgress = true;

      const chain = await this._api?.rpc.system.chain();

      if (this._wsProvider?.isConnected && chain) {
        logger.info(
          `All good. Connected to ${this._currentEndpoint}`,
          apiLabel,
        );
        this.healthCheckInProgress = false;
        return true;
      } else {
        await sleep(this.timeout);
        logger.info(`api still disconnected, disconnecting.`, apiLabel);
        await this._wsProvider.disconnect();
        throw new Error(
          `ERROR: rpc endpoint still disconnected after ${this.timeout} seconds.`,
        );
      }
    } catch (e) {
      logger.error(`Error in health check for WS Provider for rpc.`, apiLabel);
      logger.error(e, apiLabel);
      this.healthCheckInProgress = false;
      throw e;
    }
  }

  public currentEndpoint() {
    return this._currentEndpoint;
  }

  async getProvider(endpoints) {
    return await new Promise<WsProvider | undefined>((resolve, reject) => {
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

  async getAPI(retries) {
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
      const api = await ApiPromise.create({ provider: provider });
      await api.isReadyOrError;
      logger.info(`[getApi] Api is ready`, apiLabel);
      return api;
    } catch (e) {
      if (retries < 15) {
        return await this.getAPI(retries + 1);
      } else {
        return this._api;
      }
    }
  }

  async setAPI() {
    const api = await this.getAPI(0);
    this._api = api;
    this._registerEventHandlers(this._api);
  }

  isConnected(): boolean {
    return this._wsProvider.isConnected;
  }

  getApi(): ApiPromise {
    return this._api;
  }

  _registerEventHandlers(api: ApiPromise): void {
    if (api) {
      try {
        logger.info(`registering event handlers...`, apiLabel);
        api?.query?.system?.events((events) => {
          // Loop through the Vec<EventRecord>
          events.forEach((record) => {
            // Extract the phase, event and the event types
            const { event } = record;

            if (event.section == "session" && event.method == "NewSession") {
              const [session_index] = event.data;

              this.emit("newSession", {
                sessionIndex: session_index.toString(),
              });
            }

            if (
              event.section == "staking" &&
              (event.method == "Reward" || event.method == "Rewarded")
            ) {
              const [stash, amount] = event.data;

              this.emit("reward", {
                stash: stash.toString(),
                amount: amount.toString(),
              });
            }

            if (
              event.section === "imOnline" &&
              event.method === "SomeOffline"
            ) {
              const offlineVals = event.data.toJSON()[0].map((val) => val[0]);

              this.emit("someOffline", {
                offlineVals: offlineVals,
              });
            }
          });
        });
      } catch (e) {
        logger.error(`there was an error registering event handlers`, apiLabel);
        logger.error(JSON.stringify(e), apiLabel);
      }
    } else {
      logger.warn(`cannot register event handlers, api is null`, apiLabel);
    }
  }
}

export default ApiHandler;
