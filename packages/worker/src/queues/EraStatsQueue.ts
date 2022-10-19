import { Queue } from "bullmq";
import { logger } from "@1kv/common";

export const createEraStatsQueue = async (host, port) => {
  const queue = await new Queue("eraStats", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

export const addEraStatsJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Era Stats Job to Queue.....`);
  await queue.add(
    "eraStats",
    {},
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};
