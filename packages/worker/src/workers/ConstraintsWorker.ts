import { Constraints, logger } from "@1kv/common";

export const createConstraintsWorker = async (
  host,
  port,
  constraints: Constraints.OTV,
) => {
  logger.info(`Creating constraints worker...`);
  // const worker = await new Worker(
  //   "constraints",
  //   (job) => console.log(), //Jobs.processConstraintsJob(job, constraints),
  //   {
  //     connection: {
  //       host: host,
  //       port: port,
  //     },
  //     concurrency: 10,
  //     lockDuration: 3000000,
  //   },
  // );
  // return worker;
};
