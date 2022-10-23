import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "./logger";
import { sleep } from "./util";
import { POLKADOT_API_TIMEOUT } from "./constants";

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

  constructor(api: ApiPromise, endpoints: string[]) {
    super();
    this._api = api;
    this._endpoints = endpoints;
    this._registerEventHandlers(api);
  }

  static async createApi(endpoints) {
    const api = new ApiPromise({
      provider: new WsProvider(
        endpoints,
        undefined,
        undefined,
        POLKADOT_API_TIMEOUT
      ),
      // throwOnConnect: true,
    });
    if (api) {
      api
        .on("connected", () => {
          logger.info(`Connected to chain`);
        })
        .on("disconnected", async () => {
          logger.warn(`Disconnected from chain`);
        })
        .on("ready", () => {
          logger.info(`API connection ready`);
        })
        .on("error", (error) => {
          logger.warn("The API has an error");
          console.log(error);
        });
      await api.isReadyOrError.catch(logger.error);
      return api;
    }
  }

  static async create(endpoints: string[]): Promise<ApiHandler> {
    try {
      const api = await this.createApi(endpoints);
      return new ApiHandler(api, endpoints);
    } catch (e) {
      logger.info(`there was an error: `);
      console.log(e);
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

  async _reconnect(): Promise<void> {
    if (this._reconnectLock) {
      logger.info(`API Already Trying Reconnect...`);
      return;
    }

    logger.info(
      `API Disconnected... Reconnecting... (reconnect tries: ${this._reconnectTries})`
    );
    this._reconnectLock = true;
    this._reconnectTries++;
    // disconnect from the old one
    this._api.disconnect();
    // do the actual reconnection
    const nextEndpoint = this._endpoints[this._reconnectTries % 5];
    const api = await ApiPromise.create({
      provider: new WsProvider(nextEndpoint),
    });
    this._registerEventHandlers(api);
    this._api = api;
    this._reconnectLock = false;
  }
}

export default ApiHandler;
