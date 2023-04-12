import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";

import { Config, logger } from "@1kv/common";
import LRU from "lru-cache";
import koaCash from "koa-cash";
import { KoaAdapter } from "@bull-board/koa";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { otvWorker } from "@1kv/worker";
import { Queue } from "bullmq";

import router from "./routes";

export default class Server {
  public app: Koa;
  private port: number;
  private enable = true;
  private config: Config.ConfigSchema;
  private queues: Queue[] = [];

  constructor(config: Config.ConfigSchema) {
    this.app = new Koa();
    this.port = config.server.port;
    this.enable = config.server.enable;
    this.config = config;

    this.app.use(cors());
    this.app.use(bodyparser());

    const cache = new LRU({
      maxAge: 1800000, // global max age
    });
    this.app.use(
      koaCash({
        get: (key) => {
          return cache.get(key);
        },
        set(key, value) {
          return cache.set(key, value);
        },
      })
    );

    router.get("/healthcheck", (ctx) => {
      const network = config.global.networkPrefix == 2 ? "Kusama" : "Polkadot";
      ctx.body = `${network} Thousand Validators`;
      ctx.status = 200;
    });

    this.app.use(router.routes());
  }

  async addQueues() {
    const releaseMonitorQueue =
      await otvWorker.queues.createReleaseMonitorQueue(
        this.config.redis.host,
        this.config.redis.port
      );
    const constraintsQueue = await otvWorker.queues.createConstraintsQueue(
      this.config.redis.host,
      this.config.redis.port
    );
    const chaindataQueue = await otvWorker.queues.createChainDataQueue(
      this.config.redis.host,
      this.config.redis.port
    );
    const blockQueue = await otvWorker.queues.createBlockQueue(
      this.config.redis.host,
      this.config.redis.port
    );
    this.queues.push(
      releaseMonitorQueue,
      constraintsQueue,
      chaindataQueue,
      blockQueue
    );
  }

  async start(): Promise<void> {
    if (!this.enable) {
      logger.info(`Server not enabled`, { label: "Gateway" });
    } else {
      if (this.config?.redis?.host && this.config?.redis?.port) {
        await this.addQueues();
        // BullMQBoard
        const serverAdapter = new KoaAdapter();
        createBullBoard({
          queues: this.queues.map((queue) => {
            return new BullMQAdapter(queue);
          }),
          serverAdapter,
        });
        serverAdapter.setBasePath("/bull");
        this.app.use(serverAdapter.registerPlugin());
      }
      logger.info(`Now listening on ${this.port}`, { label: "Gateway" });
      const server = this.app.listen(this.port);
    }
  }
}

// process.on("SIGTERM", () => {
//   console.log("received SIGTERM");
//
//   console.log("waiting for %d sec to close server", WAIT_BEFORE_SERVER_CLOSE);
//
//   setTimeout(() => {
//     console.log("calling server close");
//
//     server.close(() => {
//       console.log("server closed, exit");
//       process.exit(0);
//     });
//   }, WAIT_BEFORE_SERVER_CLOSE * 1000);
// });
