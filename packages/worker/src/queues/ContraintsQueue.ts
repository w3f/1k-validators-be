import { Queue } from "bullmq";
import { logger } from "@1kv/common";

const constraintsLabel = { label: "ConstraintsQueue" };

export const createConstraintsQueue = async (host, port) => {
  const queue = await new Queue("constraints", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

export const addValidityJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Validity Job to Queue.....`, constraintsLabel);
  // const candidates = await queries.allCandidates();
  // for (const [index, candidate] of candidates.entries()) {
  await queue.add(
    "constraints",
    {
      jobType: "validityJob",
    },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
      attempts: 10,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
  // }
};

export const addScoreJob = async (queue: Queue, repeat: number) => {
  // const candidates = await queries.allCandidates();
  // logger.info(`adding ${candidates.length} to be scored...`);
  // for (const [index, candidate] of candidates.entries()) {
  await queue.add(
    "constraints",
    { jobType: "scoreJob" },
    {
      repeat: {
        every: repeat,
        //  limit: 100,
      },
      attempts: 10,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
  // }
  logger.info(`adding Score Job to Queue.....`, constraintsLabel);
};
