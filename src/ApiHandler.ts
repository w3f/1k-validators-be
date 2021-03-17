import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "./logger";

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private _api: ApiPromise;
  private _endpoints: string[];
  private _reconnectLock: boolean;
  private _reconnectTries = 0;

  constructor(api: ApiPromise, endpoints: string[]) {
    super();
    this._api = api;
    this._endpoints = endpoints;
    this._registerEventHandlers(api);
  }

  static async create(endpoints: string[]): Promise<ApiHandler> {
    const api = await ApiPromise.create({
      provider: new WsProvider(endpoints),
    });

    return new ApiHandler(api, endpoints);
  }

  isConnected(): boolean {
    return this._api.isConnected;
  }

  async getApi(): Promise<ApiPromise> {
    if (this._reconnectLock) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(this.getApi()), 2000);
      });
    }

    return this._api;
  }

  _registerEventHandlers(api: ApiPromise): void {
    api.query.system.events((events) => {
      // Loop through the Vec<EventRecord>
      events.forEach((record) => {
        // Extract the phase, event and the event types
        const { event } = record;

        if (event.section == "staking" && event.method == "Reward") {
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
