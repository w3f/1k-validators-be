import { Queue } from "bullmq";
import { logger } from "@1kv/common";
import { ACTIVE_VALIDATOR_JOB } from "../jobs";
import Chaindata from "@1kv/common/build/chaindata";

export const createBlockQueue = async (host, port) => {
  const queue = await new Queue("block", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

export const addAllBlocks = async (queue: Queue, chaindata: Chaindata) => {
  const latestBlock = await chaindata.getLatestBlock();
  const startBlock = latestBlock - 100;
  for (let i = latestBlock - startBlock; i < latestBlock; i++) {
    // logger.info(`querying: ${i}`);
    await addBlockJob(queue, i);
  }
};

export const addBlockJob = async (queue: Queue, blockNumber: number) => {
  // logger.info(`adding Block Job to Queue.....`);
  await queue.add(
    "block",
    { blockNumber: blockNumber },
    {
      jobId: `block${blockNumber}`,
      // repeat: {
      //     every: repeat,
      //     // limit: 1000,
      // },
      attempts: 10,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
};
