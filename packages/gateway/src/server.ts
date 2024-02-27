import Koa from "koa";
import {
  ApiHandler,
  Config,
  Constants,
  logger,
  ScoreKeeper,
} from "@1kv/common";
import { Queue } from "bullmq";

import { setupRoutes } from "./routes/setupRoutes";
import { requestEmitter } from "./events/requestEmitter";

export default class Server {
  public app: Koa;
  private port: number;
  private enable = true;
  private cache = 180000;
  private config: Config.ConfigSchema;
  private queues: Queue[] = [];
  private handler: ApiHandler | null;
  private scorekeeper: ScoreKeeper | null;

  private totalRequests = 0;
  private endpointCounts: Record<string, number> = {};

  constructor(
    config: Config.ConfigSchema,
    handler?: ApiHandler,
    scorekeeper?: ScoreKeeper | null,
  ) {
    this.config = config;
    this.app = new Koa();
    this.port = config?.server?.port;
    this.enable = config?.server?.enable || true;
    this.cache = config?.server?.cache || Constants.GATEWAY_CACHE_TTL;
    this.handler = handler || null;
    this.scorekeeper = scorekeeper || null;
    this.queues = [];

    requestEmitter.on("requestReceived", this.updateRequestCounts.bind(this));

    this.app.use(async (ctx, next) => {
      requestEmitter.emit("requestReceived", ctx.path); // Emit the event with the endpoint path
      await next();
    });

    logger.info(`Server constructed`, { label: "Gateway" });
  }

  private updateRequestCounts(endpoint: string): void {
    this.totalRequests++;
    this.endpointCounts[endpoint] = (this.endpointCounts[endpoint] || 0) + 1;
  }

  public getTotalRequests(): number {
    return this.totalRequests;
  }

  public getEndpointCounts(): Record<string, number> {
    return this.endpointCounts;
  }

  async start(): Promise<boolean> {
    try {
      logger.info(`Starting server inside Server on port ${this.port}`, {
        label: "Gateway",
      });
      await setupRoutes(
        this.app,
        this.config,
        this.port,
        this.enable,
        this.queues,
        this.cache,
        this.handler,
        this.scorekeeper,
      );
      return true;
    } catch (e) {
      logger.error(JSON.stringify(e), { label: "Gateway" });
      return false;
    }
  }
}
