/**
 * Functions for staring microservice jobs
 *
 * @function MicroserviceJobs
 */

import { logger } from "@1kv/common";
import { otvWorker } from "@1kv/worker";
import { scorekeeperLabel } from "../../scorekeeper";

/**
 * Initializes and starts various microservice jobs using BullMQ queues based on the provided configuration and chain data.
 * It checks for Redis configuration and establishes queues for different types of jobs such as release monitoring, constraints,
 * chain data processing, and block processing. This function also handles the removal of repeatable jobs if configured to do so
 * and can obliterate existing queues. Each type of job is added to its respective queue with a specified repeat interval.
 *
 * @param {Object} config - The configuration object which includes Redis connection details among other configurations.
 * @param {Object} chaindata - The chain data object required for initializing certain jobs, especially those related to block processing.
 * @returns {Promise<void>} A promise that resolves when all the jobs have been successfully initialized and started, or rejects with an error if the process fails.
 * @throws {Error} Throws an error if the Redis configuration is missing or if there's an issue starting the microservice jobs.
 *
 * @example
 * const config = {
 *   redis: {
 *     host: 'localhost',
 *     port: 6379
 *   }
 * };
 * const chaindata = new ChainData();
 * await startMicroserviceJobs(config, chaindata);
 */
export const startMicroserviceJobs = async (
  config,
  chaindata,
): Promise<any> => {
  if (!config?.redis?.host || !config?.redis?.port) {
    logger.error(
      `No redis config found. Microservice Jobs will not be started.`,
      scorekeeperLabel,
    );
    return;
  }
  try {
    // Jobs get run in separate worker
    logger.info(`Starting bullmq Queues and Workers....`, scorekeeperLabel);
    const releaseMonitorQueue =
      await otvWorker.queues.createReleaseMonitorQueue(
        config.redis.host,
        config.redis.port,
      );
    const constraintsQueue = await otvWorker.queues.createConstraintsQueue(
      config.redis.host,
      config.redis.port,
    );
    const chaindataQueue = await otvWorker.queues.createChainDataQueue(
      config.redis.host,
      config.redis.port,
    );
    const blockQueue = await otvWorker.queues.createBlockQueue(
      config.redis.host,
      config.redis.port,
    );

    const removeRepeatableJobs = true;
    if (removeRepeatableJobs) {
      logger.info(`remove jobs: ${removeRepeatableJobs}`, scorekeeperLabel);
      // Remove any previous repeatable jobs
      await otvWorker.queues.removeRepeatableJobsFromQueues([
        releaseMonitorQueue,
        constraintsQueue,
        chaindataQueue,
        blockQueue,
      ]);
    }

    const obliterateQueues = false;
    if (obliterateQueues) {
      await otvWorker.queues.obliterateQueues([
        releaseMonitorQueue,
        constraintsQueue,
        chaindataQueue,
        blockQueue,
      ]);
    }

    // Add repeatable jobs to the queues
    // Queues need to have different repeat time intervals
    await otvWorker.queues.addReleaseMonitorJob(releaseMonitorQueue, 60000);
    await otvWorker.queues.addValidityJob(constraintsQueue, 1000001);
    await otvWorker.queues.addScoreJob(constraintsQueue, 100002);
    await otvWorker.queues.addActiveValidatorJob(chaindataQueue, 100003);
    await otvWorker.queues.addDelegationJob(chaindataQueue, 100005);
    await otvWorker.queues.addEraPointsJob(chaindataQueue, 100006);
    await otvWorker.queues.addEraStatsJob(chaindataQueue, 110008);
    await otvWorker.queues.addInclusionJob(chaindataQueue, 100008);
    await otvWorker.queues.addNominatorJob(chaindataQueue, 100009);
    await otvWorker.queues.addSessionKeyJob(chaindataQueue, 100010);
    await otvWorker.queues.addValidatorPrefJob(chaindataQueue, 100101);
    await otvWorker.queues.addAllBlocks(blockQueue, chaindata);
    // TODO update this as queue job
    // await startLocationStatsJob(this.config, this.chaindata);
  } catch (e) {
    logger.error(e.toString(), scorekeeperLabel);
    logger.error("Error starting microservice jobs", scorekeeperLabel);
  }
};
