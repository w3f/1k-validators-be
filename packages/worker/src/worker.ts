import { Queue } from "bullmq";
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

class Worker {
  private api: ApiPromise;
  private apiEndpoints: string[];
  private blockQueue: Queue;
  private config: Config.ConfigSchema;
  private db: Db;

  constructor(db: Db, config: Config.ConfigSchema) {
    this.config = config;
    this.db = db;
    this.apiEndpoints = this.config.global.apiEndpoints;
  }

  async initializeAPI(): Promise<any> {
    const endpoints = this.apiEndpoints.sort(() => Math.random() - 0.5);
    console.log(`connecting to ${endpoints[0]}`);
    this.api = await ApiHandler.createApi(endpoints);
  }

  async startWorker(): Promise<any> {
    logger.info(`{Worker} starting worker....`);
  }
}

export default Worker;
