import { ApiPromise, WsProvider } from "@polkadot/api";
import EventEmitter from "eventemitter3";

import logger from "../logger";
import { API_PROVIDER_TIMEOUT, POLKADOT_API_TIMEOUT } from "../constants";

export const apiLabel = { label: "ApiHandler" };

/**
 * A higher level handler for the Polkadot-Js API that can handle reconnecting
 * to a different provider if one proves troublesome.
 */
class ApiHandler extends EventEmitter {
  private wsProvider?: WsProvider;
  private api: ApiPromise | null = null;
  private readonly endpoints: string[] = [];

  // If we're reconnecting right now, awaiting on this promise will block until connection succedes
  private connectionAttempt: Promise<void> | null = null;

  public upSince = -1;
  public isConnected = false;

  constructor(endpoints: string[]) {
    super();
    this.endpoints = endpoints.sort(() => Math.random() - 0.5);
  }

  /**
   * This copies connectWithRetry() logic from WsProvider
   * The issue with original logic is that `autoConnectMs` is set to 0 when disconnect() is called, but we
   * want to call it from nextEndpoint()
   *
   * This function can be called multiple times, and it'll wait on the same promise, without spamming reconnects.
   * @see https://github.com/polkadot-js/api/blob/2ef84c5dcdbbff8aec9ba01e4f13a50130d1a6f3/packages/rpc-provider/src/ws/index.ts#L239-L271
   */
  private async connectWithRetry(): Promise<void> {
    if (!this.wsProvider) {
      throw new Error(
        "connectWithRetry() is called before initializing WsProvider",
      );
    }

    if (this.connectionAttempt instanceof Promise) {
      await this.connectionAttempt;
      return;
    }

    this.isConnected = false;
    this.connectionAttempt = new Promise(async (resolve) => {
      try {
        await this.wsProvider.connect();

        await new Promise<void>((resolve, reject) => {
          const unsubConnect = this.wsProvider.on("connected", resolve);
          const unsubDisconnect = this.wsProvider.on("disconnected", reject);
          this.connectionAttempt.finally(() => {
            unsubConnect();
            unsubDisconnect();
          });
        });

        this.connectionAttempt = null;
        this.upSince = Date.now();
        this.isConnected = true;
        logger.info(`Connected to ${this.currentEndpoint()}`, apiLabel);
        resolve();
      } catch (err) {
        logger.warn(
          `Connection attempt to ${this.currentEndpoint()} failed: ${JSON.stringify(err)}, trying next endpoint`,
          apiLabel,
        );
        setTimeout(() => {
          this.connectionAttempt = null;
          this.connectWithRetry().then(resolve);
        }, API_PROVIDER_TIMEOUT);
      }
    });

    await this.connectionAttempt;
  }

  /**
   * In case of errors like RPC rate limit, we might want to force endpoint change
   * PJS handles endpoint rotation internally, changing the endpoint on every next connection attempt.
   * We only disconnect here; reconnect happens inside `"disconnected"` event handler
   */
  async nextEndpoint() {
    logger.info("Rotating API endpoint", apiLabel);
    await this.wsProvider.disconnect();
    await this.connectWithRetry();
  }

  currentEndpoint(): string | undefined {
    return this.wsProvider?.endpoint;
  }

  private async healthCheck(): Promise<void> {
    if (this.connectionAttempt instanceof Promise) {
      return;
    }
    try {
      const api = await this.getApi();
      await api.rpc.system.chain();
    } catch (err) {
      logger.warn(
        `Healthcheck on ${this.currentEndpoint()} failed: ${JSON.stringify(err)}, trying next endpoint`,
        apiLabel,
      );
      await this.nextEndpoint();
    }
  }

  /**
   * This function provides access to PJS api. While the ApiPromise instance never changes,
   * the function will block if we're reconnecting.
   * It's intended to be called every time instead of saving ApiPromise instance long-term.
   */
  async getApi(): Promise<ApiPromise> {
    if (!this.wsProvider) {
      this.wsProvider = new WsProvider(
        this.endpoints,
        false, // Do not autoconnect
        undefined,
        POLKADOT_API_TIMEOUT,
      );
      await this.connectWithRetry();
      this.wsProvider.on("disconnected", () => {
        logger.warn(`WsProvider disconnected`, apiLabel);
        this.connectWithRetry();
      });
    }
    if (!this.api) {
      this.api = await ApiPromise.create({
        provider: this.wsProvider,
        noInitWarn: true,
      });
      await this.api.isReady;
      this.registerEventHandlers(this.api);

      // healthcheck queries RPC, thus its interval can't be shorter than RPC timout
      setInterval(() => {
        void this.healthCheck();
      }, POLKADOT_API_TIMEOUT);
    }

    if (this.connectionAttempt instanceof Promise) {
      await this.connectionAttempt;
    }

    return this.api;
  }

  private registerEventHandlers(api: ApiPromise): void {
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
