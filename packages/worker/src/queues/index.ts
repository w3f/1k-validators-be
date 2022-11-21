import { logger } from "@1kv/common";

export * from "./ReleaseMonitorQueue";
export * from "./ContraintsQueue";
export * from "./ChainDataQueue";
export * from "./BlockQueue";
import { Queue } from "bullmq";

export const removeRepeatableJobsFromQueues = async (queues: Queue[]) => {
  logger.info("Removing repeatable jobs", { label: "Queue" });
  for (const queue of queues) {
    try {
      await removeRepeatableJobs(queue);
    } catch (e) {
      logger.error(JSON.stringify(e));
    }
  }
};

export const removeRepeatableJobs = async (queue: Queue) => {
  const repeatableJobs = await queue.getRepeatableJobs();
  repeatableJobs.forEach((job) => {
    try {
      queue.removeRepeatableByKey(job.key);
    } catch (e) {
      logger.error(JSON.stringify(e));
    }
  });
};

export const drainQueues = async (queues: Queue[]) => {
  logger.info("Draining queues", { label: "Queue" });
  for (const queue of queues) {
    try {
      await drainQueue(queue);
    } catch (e) {
      logger.error(JSON.stringify(e));
    }
  }
};

export const drainQueue = async (queue: Queue) => {
  await queue.drain();
};

export const obliterateQueues = async (queues: Queue[]) => {
  logger.info("Obliterating queues", { label: "Queue" });
  for (const queue of queues) {
    try {
      await obliterateQueue(queue);
    } catch (e) {
      logger.error(JSON.stringify(e));
    }
  }
};

export const obliterateQueue = async (queue: Queue) => {
  await queue.obliterate();
};
