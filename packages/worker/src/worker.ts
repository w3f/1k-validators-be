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
} from "@1kv/common";
import { ApiPromise } from "@polkadot/api";
import { createReleaseMonitorWorker } from "./workers/ReleaseMonitorWorker";

class Worker {
  private api: ApiPromise;
  private apiEndpoints: string[];
  private blockQueue: Queue;
  private config: Config.ConfigSchema;
  private db: Db;
  private host: string;
  private port: number;

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
    this.api = await ApiHandler.createApi(endpoints);
  }

  async startWorker(): Promise<any> {
    logger.info(`{Worker} starting worker....`);
    await this.initializeAPI();
    logger.info(`Redis host: ${this.host} port: ${this.port}`);
    await createReleaseMonitorWorker(this.host, this.port, this.db);
  }
}

export default Worker;
