import { Queue } from "bullmq";
import { ChainData, logger, queries } from "@1kv/common";

const label = { label: "BlockQueue" };

export const createBlockQueue = async (host, port) => {
  const queue = new Queue("block", {
    connection: {
      host: host,
      port: port,
    },
  });
  return queue;
};

// Add new blocks to the queue
export const addAllBlocks = async (queue: Queue, chaindata: ChainData) => {
  // Get the latest block from the chain
  const latestBlock = await chaindata.getLatestBlock();

  // get the indices of the earliest and latest blocks in the database
  const blockIndex = await queries.getBlockIndex();
  const latest = blockIndex?.latest || latestBlock;
  const earliest = blockIndex?.earliest || latestBlock;

  // If there is no block index in the database, add the latest block to the queue and set the block index to the latest block
  if (!blockIndex) {
    await addBlockJob(queue, latestBlock);
    await queries.setBlockIndex(latestBlock, latestBlock);
  }

  const threshold = 500000;

  // If the current chain block is higher than what is in the db, add all the blocks from the current one until the most recent indexed one to the queue
  if (blockIndex?.latest && latestBlock > blockIndex.latest) {
    logger.info(
      `latest block: ${latestBlock} db block: ${blockIndex.latest}, adding ${
        latestBlock - blockIndex.latest
      } blocks to queue`,
      label,
    );
    for (let i = blockIndex.latest + 1; i < latestBlock; i++) {
      await addBlockJob(queue, i);
    }
  }

  if (earliest) {
    const targetEarliest = earliest - threshold > 0 ? earliest - threshold : 0;
    logger.info(
      `earliest ${earliest} target earliest: ${targetEarliest}, adding ${
        earliest - targetEarliest
      } to the queue`,
      label,
    );
    for (let i = earliest; i > targetEarliest; i--) {
      await addBlockJob(queue, i);
    }
  }
};

export const addBlockJob = async (queue: Queue, blockNumber: number) => {
  await queue.add(
    "block",
    { blockNumber: blockNumber },
    {
      jobId: `block${blockNumber}`,
      attempts: 10,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
};
