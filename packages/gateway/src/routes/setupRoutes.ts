import Router from "@koa/router";
import { ApiHandler, Config, logger, ScoreKeeper } from "@1kv/common";
import { response } from "../controllers";
import path from "path";
import mount from "koa-mount";
import yamljs from "yamljs";
import { koaSwagger } from "koa2-swagger-ui";
import { Queue } from "bullmq";

import Koa from "koa";

import * as packageJson from "../../package.json";
import { LRUCache } from "lru-cache";
import router from "./index";
import bodyparser from "koa-bodyparser";
import cors from "koa2-cors";
import serve from "koa-static";
import koaCash from "koa-cash";
import { KoaAdapter } from "@bull-board/koa";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";

export const setupHealthCheckRoute = (
  routerInstance: Router,
  handler?: ApiHandler,
): boolean => {
  try {
    const version = packageJson.version;
    const isConnected = handler?.isConnected();
    const currentEndpoint = handler?.currentEndpoint();

    const response = {
      version,
      connected: isConnected,
      currentEndpoint,
      upSince: handler?.upSince,
    };

    routerInstance.get("/healthcheck", async (ctx) => {
      if (handler) {
        const isConnected = handler.isConnected();
        if (isConnected) {
          const isHealthy = await handler.healthCheck();
          ctx.body = JSON.stringify(response);
          ctx.status = 200;
        } else {
          ctx.body = `API Handler not Connected!`;
          ctx.status = 403;
        }
      } else {
        ctx.body = `Good!`;
        ctx.status = 200;
      }
    });
    return true;
  } catch (e) {
    logger.error(`Error setting up health check route: ${e}`, {
      label: "Gateway",
    });
    return false;
  }
};

export const setupScorekeeperRoutes = (
  router: Router,
  app: Koa,
  scorekeeper?: ScoreKeeper,
): boolean => {
  logger.info(`Setting up scorekeeper routes`, { label: "Gateway" });
  try {
    // Scorekeeper Jobs Status
    if (scorekeeper) {
      // TODO update swagger
      router.get("/scorekeeper/jobs", async (ctx) => {
        response(ctx, 200, scorekeeper.getJobsStatusAsJson());
      });
      // TODO update swagger
      router.get("/nominators/status", async (ctx) => {
        response(ctx, 200, scorekeeper.getAllNominatorStatusJson());
      });
    }

    // Scorekeeper Status UI
    const viteBuildPath = path.resolve(
      __dirname,
      "../../../scorekeeper-status-ui/dist",
    );
    // TODO update swagger
    app.use(mount("/status", serve(viteBuildPath)));

    const assetsPath = path.resolve(
      __dirname,
      "../../../scorekeeper-status-ui/dist/assets",
    );

    app.use(mount("/assets", serve(assetsPath)));
    return true;
  } catch (e) {
    logger.error(`Error setting up scorekeeper routes: ${e}`, {
      label: "Gateway",
    });
    return false;
  }
};

export const setupDocs = (app: Koa, config: Config.ConfigSchema): boolean => {
  try {
    // Docusarus docs
    const serveDocs = config?.server?.serveDocs || true;
    if (serveDocs) {
      const docsPath = path.join(__dirname, "../../../../docs/build");
      // TODO update swagger
      app.use(mount("/docs", serve(docsPath)));
    }

    // Swagger UI
    const serveSwagger = config?.server?.serveSwagger || true;
    if (serveSwagger) {
      const swaggerSpec = yamljs.load(
        path.join(__dirname, "../../src/swagger.yml"),
      );
      app.use(
        koaSwagger({
          routePrefix: "/",
          swaggerOptions: {
            spec: swaggerSpec,
          },
        }),
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error setting up docs: ${e}`, { label: "Gateway" });
    return false;
  }
};

export const setupMicroserviceRoutes = async (
  app: Koa,
  config: Config.ConfigSchema,
  queues: Queue[],
): Promise<boolean> => {
  try {
    if (config?.redis?.host && config?.redis?.port) {
      await addQueues(config, queues);
      setupBullBoard(app, queues);
    }
    return true;
  } catch (e) {
    logger.error(`Error setting up microservice routes: ${e}`, {
      label: "Gateway",
    });
    return false;
  }
};

// Add BullMQ Queues for Microservice Jobs
export const addQueues = async (
  config: Config.ConfigSchema,
  queues: Queue[],
): Promise<boolean> => {
  try {
    const releaseMonitorQueue = new Queue("releaseMonitor", {
      connection: {
        host: config?.redis?.host,
        port: config?.redis?.port,
      },
    });
    const constraintsQueue = new Queue("constraints", {
      connection: {
        host: config?.redis?.host,
        port: config?.redis?.port,
      },
    });
    const chaindataQueue = new Queue("chaindata", {
      connection: {
        host: config?.redis?.host,
        port: config?.redis?.port,
      },
    });
    const blockQueue = new Queue("block", {
      connection: {
        host: config?.redis?.host,
        port: config?.redis?.port,
      },
    });

    queues.push(
      releaseMonitorQueue,
      constraintsQueue,
      chaindataQueue,
      blockQueue,
    );
    return true;
  } catch (e) {
    logger.error(`Error adding queues: ${e}`, { label: "Gateway" });
    return false;
  }
};

export const setupBullBoard = (app: Koa, queues: Queue[]): void => {
  try {
    const serverAdapter = new KoaAdapter();
    createBullBoard({
      queues: queues.map((queue) => new BullMQAdapter(queue)),
      serverAdapter: serverAdapter as never,
    });
    serverAdapter.setBasePath("/bull");
    app.use(serverAdapter.registerPlugin());
  } catch (error) {
    console.error(`Error setting up BullBoard: ${error}`);
  }
};

export const setupCache = (app: Koa, configCache: number): boolean => {
  try {
    logger.info(`Cache set to ${configCache}`, { label: "Gateway" });

    const cache = new LRUCache({
      ttl: configCache, // Cache items will expire after 3 minutes
      max: 500, // Maximum number of items allowed in the cache
    });
    app.use(
      koaCash({
        get: (key) => {
          return cache.get(key);
        },
        set(key, value, maxAge) {
          return cache.set(key, value, maxAge);
        },
      }),
    );
    return true;
  } catch (e) {
    logger.error(`Error setting up cache: ${e}`, { label: "Gateway" });
    return false;
  }
};

export const setupRoutes = async (
  app: Koa,
  config: Config.ConfigSchema,
  port: number,
  enable: boolean,
  queues?: Queue[],
  cache?: number,
  handler?: ApiHandler,
  scorekeeper?: ScoreKeeper,
): Promise<boolean> => {
  logger.info(`Setting up routes`, { label: "Gateway" });
  try {
    if (!enable) {
      logger.info(`Server not enabled`, { label: "Gateway" });
    } else {
      app.use(cors());
      app.use(bodyparser());

      // If onlyHealth is true, only serve the health check route. Used when imported from other services for service health checks. False by default
      const onlyHealth = config?.server?.onlyHealth || false;
      if (onlyHealth) {
        logger.info(`Only serving health check route`, { label: "Gateway" });
        const healthRouter = new Router();

        // Set up the health check route on the healthRouter
        setupHealthCheckRoute(healthRouter, handler);
        setupScorekeeperRoutes(healthRouter, app, scorekeeper);

        app.use(healthRouter.routes());
      } else {
        logger.info(`Setting up all routes`, { label: "Gateway" });
        setupCache(app, cache);
        setupHealthCheckRoute(router, handler);
        setupScorekeeperRoutes(router, app, scorekeeper);
        setupDocs(app, config);

        // Setup microservice routes if Redis is configured in config
        await setupMicroserviceRoutes(app, config, queues);

        // Serve all other routes
        app.use(router.routes());
      }
      app.listen(port);
    }
    return true;
  } catch (e) {
    logger.error(`Error setting up routes: ${e}`, { label: "Gateway" });
    return false;
  }
};
