import { Worker } from "bullmq";
import { processReleaseMonitorJob } from "../jobs/ReleaseMonitorJob";
import { logger } from "@1kv/common";

export const createReleaseMonitorWorker = async (host, port) => {
  logger.info(`Creating releaseMonitor worker...`);
  const worker = await new Worker(
    "releaseMonitor",
    (job) => processReleaseMonitorJob(job),
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
