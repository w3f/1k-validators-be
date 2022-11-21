import { Worker } from "bullmq";
import { ApiHandler, ChainData, logger } from "@1kv/common";
import { processBlockDataJob } from "../jobs";

export const createBlockWorker = async (host, port, api: ApiHandler) => {
  logger.info(`Creating Block Worker...`, { label: "BlockWorker" });
  const chaindata = new ChainData(api);
  const worker = await new Worker(
    "block",
    (job) => processBlockDataJob(job, chaindata),
    {
      connection: {
        host: host,
        port: port,
      },
      concurrency: 4,
      lockDuration: 300000,
    }
  );
  worker.on("completed", (job, result) => {
    // job has completed
    const blockNumber = job.data.blockNumber;
    const executionTime = result;
    // logger.info(`Indexed block #${blockNumber} (${executionTime}s)`, {
    //   label: "BlockWorker",
    // });
  });
  return worker;
};
