export * from "./ReleaseMonitorQueue";
export * from "./ContraintsQueue";
export * from "./ChainDataQueue";
import { Queue } from "bullmq";

export const removeRepeatableJobsFromQueues = async (queues: Queue[]) => {
  for (const queue of queues) {
    await removeRepeatableJobs(queue);
  }
};

export const removeRepeatableJobs = async (queue: Queue) => {
  const repeatableJobs = await queue.getRepeatableJobs();
  repeatableJobs.forEach((job) => {
    queue.removeRepeatableByKey(job.key);
  });
};
