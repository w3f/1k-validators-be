import { Queue, Worker } from "bullmq";
import { processReleaseMonitorJob } from "../jobs/ReleaseMonitorJob";
import { logger } from "@1kv/common";

export const createReleaseMonitorWorker = async (host, port, db) => {
  logger.info(`Creating releaseMonitor worker...`);
  const worker = await new Worker(
    "releaseMonitor",
    (job) => processReleaseMonitorJob(job, db),
    {
      connection: {
        host: host,
        port: port,
      },
      concurrency: 10,
    }
  );
  return worker;
};
