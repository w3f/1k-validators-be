import { Queue, Worker as BullWorker } from "bullmq";
import { ApiHandler, logger, Db, Config, Constraints } from "@1kv/common";
import { createReleaseMonitorWorker } from "./workers/ReleaseMonitorWorker";
import { createConstraintsWorker } from "./workers/ConstraintsWorker";
import { createChainDataWorker } from "./workers";
import { createBlockWorker } from "./workers/BlockWorker";

export const workerLabel = { label: "Worker" };

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
    logger.info(`Redis host: ${this.host} port: ${this.port}`, workerLabel);
  }

  async initializeAPI(): Promise<any> {
    const endpoints = this.apiEndpoints.sort(() => Math.random() - 0.5);
    logger.info(`ApiHandler connecting to ${endpoints[0]}`, workerLabel);
    this.api = await ApiHandler.create(endpoints);
  }

  async initializeConstraints(): Promise<any> {
    this.constraints = new Constraints.OTV(this.api, this.config);
  }

  async startWorker(): Promise<any> {
    logger.info(`starting worker....`, workerLabel);
    await this.initializeAPI();
    await this.initializeConstraints();
    logger.info(`Redis host: ${this.host} port: ${this.port}`, workerLabel);
    const releaseMonitorWorker = await createReleaseMonitorWorker(
      this.host,
      this.port
    );
    logger.info(
      `Created release monitor worker: ${releaseMonitorWorker.id}`,
      workerLabel
    );
    const constraintsWorker = await createConstraintsWorker(
      this.host,
      this.port,
      this.constraints
    );
    logger.info(
      `Created constraints worker: ${constraintsWorker.id}`,
      workerLabel
    );
    const chaindataWorker = await createChainDataWorker(
      this.host,
      this.port,
      this.api
    );
    logger.info(`Created chaindata worker: ${chaindataWorker.id}`, workerLabel);
    const blockWorker = await createBlockWorker(this.host, this.port, this.api);
    logger.info(`Created block worker: ${blockWorker.id}`, workerLabel);
  }
}

export default Worker;
