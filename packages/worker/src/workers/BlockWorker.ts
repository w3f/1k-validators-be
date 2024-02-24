import { ApiHandler, logger } from "@1kv/common";

export const createBlockWorker = async (host, port, api: ApiHandler) => {
  logger.info(`Creating Block Worker...`, { label: "BlockWorker" });
  // const chaindata = new ChainData(api);
  // const worker = await new Worker(
  //   "block",
  //   (job) => () => {
  //     console.log();
  //   }, //Jobs.processBlockDataJob(job, chaindata),
  //   {
  //     connection: {
  //       host: host,
  //       port: port,
  //     },
  //     concurrency: 4,
  //     lockDuration: 300000,
  //   },
  // );
  // worker.on("completed", (job, result) => {
  //   // job has completed
  //   const blockNumber = job.data.blockNumber;
  //   const executionTime = result;
  //   // logger.info(`Indexed block #${blockNumber} (${executionTime}s)`, {
  //   //   label: "BlockWorker",
  //   // });
  // });
  // return worker;
};
