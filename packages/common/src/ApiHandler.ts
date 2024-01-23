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
    const timeout = 30;
    let api, wsProvider;

    const healthCheck = async (api, retries = 0) => {
      if (retries < 15) {
        try {
          logger.info(
            `Performing health check for WS Provider for rpc.`,
            apiLabel,
          );

          await sleep(timeout * 1000);
          if (api && api?.isConnected) {
            logger.info(`All good. Connected`, apiLabel);
            return api;
          } else {
            if (api) {
              logger.info(
                `api exists but is not connected. Disconnecting....`,
                apiLabel,
              );
              await api?.disconnect();
              logger.info(
                `api disconnected, sleep 6s and create api again`,
                apiLabel,
              );
              await sleep(6000);
              // return await this.createApi(endpoints, reconnectTries + 1);
              throw new Error(
                `ERROR: rpc endpoint still disconnected after ${timeout} seconds.`,
              );
            } else {
              logger.info(
                `api doesn't exist and rpc endpoint still disconnected after ${timeout} seconds. creating api again... `,
                apiLabel,
              );

              // return await this.createApi(endpoints, reconnectTries + 1);
              //
              throw new Error(
                `ERROR: rpc endpoint still disconnected after ${timeout} seconds.`,
              );
            }
          }
        } catch (e) {
          logger.error(`there was an error with the health check: `, apiLabel);
          logger.error(JSON.stringify(e), apiLabel);
          await healthCheck(api, retries + 1);
        }
      } else {
        logger.error(`reconnectTries exceeded`, apiLabel);
        return api;
      }
    };

    const registerApi = async (api) => {
      if (!api) {
        logger.warn(`api is null`, apiLabel);
        return;
      }
      try {
        logger.info(`registering api...`, apiLabel);
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
              logger.warn(`there was an error: `, apiLabel);
              logger.error(error, apiLabel);
              await Promise.reject(error);
            }
          })
          .on("ready", () => {
            logger.info(`API connection ready ${endpoints[0]}`, apiLabel);
          })
          .on("error", async (error) => {
            logger.warn("The API has an error", apiLabel);
            logger.error(JSON.stringify(error), apiLabel);
            logger.warn(`attempting to reconnect to ${endpoints[0]}`, apiLabel);
            try {
              await healthCheck(wsProvider);
              await Promise.resolve(api);
            } catch (error: any) {
              logger.error(`there was an error: `, apiLabel);
              logger.error(error, apiLabel);
              await Promise.reject(error);
            }
          });
      } catch (e) {
        logger.warn(`there was an error registering api`, apiLabel);
        logger.error(JSON.stringify(e), apiLabel);
      }

      return api;
    };

    try {
      api = new ApiPromise({
        provider: new WsProvider(
          endpoints,
          35000,
          undefined,
          POLKADOT_API_TIMEOUT,
        ),
        // throwOnConnect: true,
      });

      await sleep(6000);
      api = registerApi(api);
      if (api) {
        try {
          await api.isReadyOrError;
        } catch (error) {
          await api?.disconnect();
          logger.error(`isReadyorError: `, apiLabel);
          logger.error(JSON.stringify(error), apiLabel);
          return registerApi(
            await this.createApi(endpoints, reconnectTries + 1),
          );
        }

        return api;
      }
    } catch (e) {
      logger.error(`there was an error: `, apiLabel);
      logger.error(e, apiLabel);
      if (reconnectTries < 15) {
        logger.warn(
          `reconnecting to endpoints: retries ${reconnectTries}`,
          apiLabel,
        );
        return await this.createApi(
          endpoints.sort(() => Math.random() - 0.5),
          reconnectTries + 1,
        );
      } else {
        logger.warn(`reconnectTries exceeded`, apiLabel);
        return api;
      }
    }
  }

  static async create(endpoints: string[]): Promise<ApiHandler> {
    try {
      const api = await this.createApi(
        endpoints.sort(() => Math.random() - 0.5),
      );

      return new ApiHandler(api, endpoints);
    } catch (e) {
      logger.warn(`"create" has an error: `, apiLabel);
      logger.error(e, apiLabel);
      logger.warn(`creating with different endpoints...`, apiLabel);
      // return await this.create(endpoints);
      throw new Error("ERROR: create api failed");
    }
  }

  isConnected(): boolean {
    return this._api.isConnected;
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
