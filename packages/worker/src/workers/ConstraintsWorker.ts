import { Queue, Worker } from "bullmq";
import { processReleaseMonitorJob } from "../jobs/ReleaseMonitorJob";
import { logger, Constraints } from "@1kv/common";
import { processConstraintsJob } from "../jobs/ConstraintsJob";

export const createConstraintsWorker = async (
  host,
  port,
  constraints: Constraints.OTV
) => {
  logger.info(`Creating constraints worker...`);
  const worker = await new Worker(
    "constraints",
    (job) => processConstraintsJob(job, constraints),
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
