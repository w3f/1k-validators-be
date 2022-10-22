import { Queue } from "bullmq";

export const createReleaseMonitorQueue = async (host, port) => {
  const queue = await new Queue("releaseMonitor", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

export const addReleaseMonitorJob = async (queue: Queue, repeat: number) => {
  await queue.add(
    "releaseMonitor",
    {},
    {
      repeat: {
        every: repeat,
        limit: 100,
      },
    }
  );
};
