import { logger } from "@1kv/common";

export const createReleaseMonitorWorker = async (host, port) => {
  logger.info(`Creating releaseMonitor worker...`);
  // const worker = await new Worker(
  //   "releaseMonitor",
  //   (job) => console.log(), //Jobs.processReleaseMonitorJob(job),
  //   {
  //     connection: {
  //       host: host,
  //       port: port,
  //     },
  //     concurrency: 4,
  //     lockDuration: 300000,
  //   },
  // );
  // return worker;
};
