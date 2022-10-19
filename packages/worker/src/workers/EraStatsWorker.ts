import { Queue, Worker } from "bullmq";
import { processReleaseMonitorJob } from "../jobs/ReleaseMonitorJob";
import { logger, Constraints, ChainData, ApiHandler, Db } from "@1kv/common";
import { processConstraintsJob } from "../jobs/ConstraintsJob";
import { processEraStatsJob } from "../jobs";

export const createEraStatsWorker = async (
  host,
  port,
  db: Db,
  api: ApiHandler
) => {
  logger.info(`Creating Era Stats worker...`);
  const chaindata = new ChainData(api);
  const worker = await new Worker(
    "constraints",
    (job) => processEraStatsJob(job, db, chaindata),
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
