import { Queue } from "bullmq";
import { logger } from "@1kv/common";

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
  logger.info(`adding Validity Job to Queue.....`);
  await queue.add(
    "constraints",
    { jobType: "validityJob" },
    {
      repeat: {
        every: repeat,
        // limit: 1000,
      },
    }
  );
};

export const addScoreJob = async (queue: Queue, repeat: number) => {
  logger.info(`adding Score Job to Queue.....`);
  await queue.add(
    "constraints",
    { jobType: "scoreJob" },
    {
      repeat: {
        every: repeat,
        // limit: 100,
      },
    }
  );
};
