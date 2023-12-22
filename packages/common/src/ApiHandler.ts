import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "./logger";
import { sleep } from "./util";
import { POLKADOT_API_TIMEOUT } from "./constants";

export const apiLabel = { label: "ApiHandler" };

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private _api: ApiPromise;
  private _endpoints: string[];
  private _reconnectLock: boolean;
  private _reconnectTries = 0;
  static isConnected: any;
  static _reconnect: any;

  constructor(api: ApiPromise, endpoints?: string[]) {
    super();
    this._api = api;
    // this._endpoints = endpoints.sort(() => Math.random() - 0.5);
    this._registerEventHandlers(api);
  }

  static async createApi(endpoints, reconnectTries = 0) {
    const timeout = 12;
    let api, wsProvider;
    const healthCheck = async (api) => {
      logger.info(`Performing health check for WS Provider for rpc.`, apiLabel);

      await sleep(timeout * 1000);
      if (api.isConnected) {
        logger.info(`All good. Connected back to`, apiLabel);
        return true;
      } else {
        logger.info(
          `rpc endpoint still disconnected after ${timeout} seconds. Disconnecting `,
          apiLabel
        );
        await api.disconnect();

        throw new Error(
          `rpc endpoint still disconnected after ${timeout} seconds.`
        );
      }
    };

    try {
      wsProvider = new WsProvider(
        endpoints,
        undefined,
        undefined,
        POLKADOT_API_TIMEOUT
      );

      api = new ApiPromise({
        provider: new WsProvider(
          endpoints,
          undefined,
          undefined,
          POLKADOT_API_TIMEOUT
        ),
        // throwOnConnect: true,
      });

      api
        .on("connected", () => {
          logger.info(`Connected to chain ${endpoints[0]}`, apiLabel);
        })
        .on("disconnected", async () => {
          logger.warn(`Disconnected from chain`, apiLabel);
          try {
            await healthCheck(wsProvider);
            await Promise.resolve(api);
          } catch (error: any) {
            await Promise.reject(error);
          }
        })
        .on("ready", () => {
          logger.info(`API connection ready ${endpoints[0]}`, apiLabel);
        })
        .on("error", async (error) => {
          logger.warn("The API has an error", apiLabel);
          logger.error(error);
          logger.warn(`attempting to reconnect to ${endpoints[0]}`, apiLabel);
          try {
            await healthCheck(wsProvider);
            await Promise.resolve(api);
          } catch (error: any) {
            await Promise.reject(error);
          }
        });

      if (api) {
        await api.isReadyOrError.catch(logger.error);

        return api;
      }
    } catch (e) {
      logger.error(`there was an error: `, apiLabel);
      logger.error(e, apiLabel);
      if (reconnectTries < 10) {
        return await this.createApi(
          endpoints.sort(() => Math.random() - 0.5),
          reconnectTries + 1
        );
      } else {
        return api;
      }
    }
  }

  static async create(endpoints: string[]): Promise<ApiHandler> {
    try {
      const api = await this.createApi(
        endpoints.sort(() => Math.random() - 0.5)
      );

      return new ApiHandler(api, endpoints);
    } catch (e) {
      logger.info(`there was an error: `, apiLabel);
      logger.error(e, apiLabel);
    }
  }

  isConnected(): boolean {
    return this._api.isConnected;
  }

  getApi(): ApiPromise {
    return this._api;
  }

  _registerEventHandlers(api: ApiPromise): void {
    api.query.system.events((events) => {
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

        if (event.section === "imOnline" && event.method === "SomeOffline") {
          const offlineVals = event.data.toJSON()[0].map((val) => val[0]);

          this.emit("someOffline", {
            offlineVals: offlineVals,
          });
        }
      });
    });
  }
}

export default ApiHandler;
