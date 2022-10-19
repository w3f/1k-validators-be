export * from "./ReleaseMonitorQueue";
export * from "./ContraintsQueue";
export * from "./EraStatsQueue";
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
