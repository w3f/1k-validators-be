import { Queue } from "bullmq";
import { logger, queries } from "@1kv/common";

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
  const candidates = await queries.allCandidates();
  for (const [index, candidate] of candidates.entries()) {
    await queue.add(
      "constraints",
      {
        jobType: "validityJob",
        candidateAddress: candidate.stash,
      },
      {
        repeat: {
          every: repeat + index,
          // limit: 1000,
        },
        attempts: 10,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  }
};

export const addScoreJob = async (queue: Queue, repeat: number) => {
  const candidates = await queries.validCandidates();
  logger.info(`adding ${candidates.length} to be scored...`);
  for (const [index, candidate] of candidates.entries()) {
    await queue.add(
      "constraints",
      { jobType: "scoreJob", candidateAddress: candidate.stash },
      {
        repeat: {
          every: repeat + index,
          //  limit: 100,
        },
        attempts: 10,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );
  }
  logger.info(`adding Score Job to Queue.....`);
};
