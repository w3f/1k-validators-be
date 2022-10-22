import { Queue, Worker as BullWorker } from "bullmq";
import { ApiHandler, logger, Db, Config, Constraints } from "@1kv/common";
import { createReleaseMonitorWorker } from "./workers/ReleaseMonitorWorker";
import { createConstraintsWorker } from "./workers/ConstraintsWorker";
import { createChainDataWorker } from "./workers";

class Worker {
  private api: ApiHandler;
  private apiEndpoints: string[];
  private config: Config.ConfigSchema;
  private host: string;
  private port: number;
  private constraints: Constraints.OTV;

  constructor(config: Config.ConfigSchema) {
    this.config = config;
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
    this.constraints = new Constraints.OTV(this.api, this.config);
  }

  async startWorker(): Promise<any> {
    logger.info(`{Worker} starting worker....`);
    await this.initializeAPI();
    await this.initializeConstraints();
    logger.info(`Redis host: ${this.host} port: ${this.port}`);
    const releaseMonitorWorker = await createReleaseMonitorWorker(
      this.host,
      this.port
    );
    logger.info(
      `{Worker} Created release monitor worker: ${releaseMonitorWorker.id}`
    );
    const constraintsWorker = await createConstraintsWorker(
      this.host,
      this.port,
      this.constraints
    );
    logger.info(`{Worker} Created constraints worker: ${constraintsWorker.id}`);
    const chaindataWorker = await createChainDataWorker(
      this.host,
      this.port,
      this.api
    );
    logger.info(`{Worker} Created chaindata worker: ${chaindataWorker.id}`);
  }
}

export default Worker;
