import Koa from "koa";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";

import { Config, logger } from "@1kv/common";
import LRU from "lru-cache";
import koaCash from "koa-cash";
import { KoaAdapter } from "@bull-board/koa";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
// import { otvWorker } from "@1kv/worker";
import { Queue } from "bullmq";
import path from "path";
import serve from "koa-static";

import router from "./routes";
import mount from "koa-mount";
import { koaSwagger } from "koa2-swagger-ui";
import yamljs from "yamljs";
import Router from "@koa/router";

export default class Server {
  public app: Koa;
  private port: number;
  private enable = true;
  private cache = 180000;
  private config: Config.ConfigSchema;
  private queues: Queue[] = [];

  constructor(config: Config.ConfigSchema) {
    this.config = config;
    this.app = new Koa();
    this.port = config?.server?.port;
    this.enable = config?.server?.enable || true;
    this.cache = config?.server?.cache || 180000;

    this.app.use(cors());
    this.app.use(bodyparser());

    logger.info(`Cache set to ${this.cache}`, { label: "Gateway" });

    const cache = new LRU({
      max: this.cache, // global max age
    });
    this.app.use(
      koaCash({
        get: (key) => {
          return cache.get(key);
        },
        set(key, value) {
          return cache.set(key, value);
        },
      }),
    );

    // If onlyHealth is true, only serve the health check route. Used when imported from other services for service health checks. False by default
    const onlyHealth = config?.server?.onlyHealth || false;
    if (onlyHealth) {
      logger.info(`Only serving health check route`, { label: "Gateway" });
      const healthRouter = new Router();
      // Health check route
      healthRouter.get("/healthcheck", (ctx) => {
        ctx.body = `Good!`;
        ctx.status = 200;
      });
      this.app.use(healthRouter.routes());
    } else {
      // Health check route
      router.get("/healthcheck", (ctx) => {
        ctx.body = `Good!`;
        ctx.status = 200;
      });

      // Docusarus docs
      const serveDocs = config?.server?.serveDocs || true;
      if (serveDocs) {
        const docsPath = path.join(__dirname, "../../../docs/build");
        this.app.use(mount("/docs", serve(docsPath)));
      }

      // Swagger UI
      const serveSwagger = config?.server?.serveSwagger || true;
      if (serveSwagger) {
        const swaggerSpec = yamljs.load(
          path.join(__dirname, "../src/swagger.yml"),
        ); //
        this.app.use(
          koaSwagger({
            routePrefix: "/",
            swaggerOptions: {
              spec: swaggerSpec,
            },
          }),
        );
      }

      // Serve all other routes
      this.app.use(router.routes());
    }
  }

  // Add BullMQ queues
  async addQueues() {
    const releaseMonitorQueue = new Queue("releaseMonitor", {
      connection: {
        host: this.config?.redis?.host,
        port: this.config?.redis?.port,
      },
    });
    const constraintsQueue = new Queue("constraints", {
      connection: {
        host: this.config?.redis?.host,
        port: this.config?.redis?.port,
      },
    });
    const chaindataQueue = new Queue("chaindata", {
      connection: {
        host: this.config?.redis?.host,
        port: this.config?.redis?.port,
      },
    });
    const blockQueue = new Queue("block", {
      connection: {
        host: this.config?.redis?.host,
        port: this.config?.redis?.port,
      },
    });

    this.queues.push(
      releaseMonitorQueue,
      constraintsQueue,
      chaindataQueue,
      blockQueue,
    );
  }

  async start(): Promise<void> {
    if (!this.enable) {
      logger.info(`Server not enabled`, { label: "Gateway" });
    } else {
      // If Redis is in the config and this is run as microservices, add bull board as an endpoint at `/bull`
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
