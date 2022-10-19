import { Queue, Worker as BullWorker } from "bullmq";
import {
  ApiHandler,
  ChainData,
  Constants,
  logger,
  Types,
  Util,
  Db,
  Config,
  Constraints,
} from "@1kv/common";
import { ApiPromise } from "@polkadot/api";
import { createReleaseMonitorWorker } from "./workers/ReleaseMonitorWorker";
import { createConstraintsWorker } from "./workers/ConstraintsWorker";
import { createEraStatsWorker } from "./workers";

class Worker {
  private api: ApiHandler;
  private apiEndpoints: string[];
  private blockQueue: Queue;
  private config: Config.ConfigSchema;
  private db: Db;
  private host: string;
  private port: number;
  private constraints: Constraints.OTV;

  constructor(db: Db, config: Config.ConfigSchema) {
    this.config = config;
    this.db = db;
    this.apiEndpoints = this.config.global.apiEndpoints;
    this.host = this.config.redis.host;
    this.port = this.config.redis.port;
    logger.info(`Redis host: ${this.host} port: ${this.port}`);
  }

  async initializeAPI(): Promise<any> {
    const endpoints = this.apiEndpoints.sort(() => Math.random() - 0.5);
    logger.info(`{Worker} connecting to ${endpoints[0]}`);
    this.api = await ApiHandler.create(endpoints);
  }

  async initializeConstraints(): Promise<any> {
    this.constraints = new Constraints.OTV(this.api, this.config, this.db);
  }

  async startWorker(): Promise<any> {
    logger.info(`{Worker} starting worker....`);
    await this.initializeAPI();
    await this.initializeConstraints();
    logger.info(`Redis host: ${this.host} port: ${this.port}`);
    const releaseMonitorWorker = await createReleaseMonitorWorker(
      this.host,
      this.port,
      this.db
    );
    const constraintsWorker = await createConstraintsWorker(
      this.host,
      this.port,
      this.constraints
    );
    const eraStatsWorker = await createEraStatsWorker(
      this.host,
      this.port,
      this.db,
      this.api
    );
  }
}

export default Worker;
