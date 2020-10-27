import { ApiPromise, WsProvider } from "@polkadot/api";

import logger from "./logger";

// TODO: move to constants
const KusamaEndpoints = [
  "wss://cc3-1.kusama.network",
  "wss://cc3-2.kusama.network",
  "wss://cc3-3.kusama.network",
  "wss://cc3-4.kusama.network",
  "wss://cc3-5.kusama.network",
];

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler {
  private _api: ApiPromise;
  private _reconnectLock: boolean;
  private _reconnectTries = 0;

  constructor(api: ApiPromise) {
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
