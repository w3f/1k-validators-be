import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import { KusamaEndpoints } from "./constants";
import logger from "./logger";

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private _api: ApiPromise;
  private _reconnectLock: boolean;
  private _reconnectTries = 0;

  constructor(api: ApiPromise) {
    super();
    this._api = api;
    this._registerEventHandlers(api);
  }

  static async create(): Promise<ApiHandler> {
    const initialEndpoint = KusamaEndpoints[3];
    const api = await ApiPromise.create({
      provider: new WsProvider(initialEndpoint),
    });

    return new ApiHandler(api);
  }

  isConnected(): boolean {
    // TODO does this actual check if it's connected?
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
    api.on("disconnected", () => {
      this._reconnect();
    });

    api.on("error", (err: Error) => {
      logger.info(`API ERROR ${err.toString()}`);
      this._reconnect();
    });

    api.query.system.events((events) => {
      console.log(`\nReceived ${events.length} events:`);

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
    const nextEndpoint = KusamaEndpoints[this._reconnectTries % 5];
    const api = await ApiPromise.create({
      provider: new WsProvider(nextEndpoint),
    });
    this._registerEventHandlers(api);
    this._api = api;
    this._reconnectLock = false;
  }
}

export default ApiHandler;
