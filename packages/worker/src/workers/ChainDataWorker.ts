import { Worker } from "bullmq";
import { logger, Db, ChainData, ApiHandler } from "@1kv/common";
import { processChainDataJob } from "../jobs/ChainDataJob";

export const createChainDataWorker = async (
  host,
  port,
  db: Db,
  api: ApiHandler
) => {
  logger.info(`Creating constraints worker...`);
  const chaindata = new ChainData(api);
  const worker = await new Worker(
    "chaindata",
    (job) => processChainDataJob(job, db, chaindata),
    {
      connection: {
        host: host,
        port: port,
      },
      concurrency: 50,
      lockDuration: 300000,
    }
  );
  return worker;
};
