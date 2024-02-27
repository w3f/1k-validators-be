import { logger } from "../..//index";

// import { otvWorker } from "@1kv/worker";
import { scorekeeperLabel } from "../scorekeeper";
import { Jobs } from "./JobsClass";

export class JobsMicroservice extends Jobs {
  _startSpecificJobs = async (): Promise<void> => {
    const { config, chaindata } = this.metadata;
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
      // const releaseMonitorQueue =
      //   await otvWorker.queues.createReleaseMonitorQueue(
      //     config.redis.host,
      //     config.redis.port,
      //   );
      // const constraintsQueue = await otvWorker.queues.createConstraintsQueue(
      //   config.redis.host,
      //   config.redis.port,
      // );
      // const chaindataQueue = await otvWorker.queues.createChainDataQueue(
      //   config.redis.host,
      //   config.redis.port,
      // );
      // const blockQueue = await otvWorker.queues.createBlockQueue(
      //   config.redis.host,
      //   config.redis.port,
      // );
      //
      // const removeRepeatableJobs = true;
      // if (removeRepeatableJobs) {
      //   logger.info(`remove jobs: ${removeRepeatableJobs}`, scorekeeperLabel);
      //   // Remove any previous repeatable jobs
      //   await otvWorker.queues.removeRepeatableJobsFromQueues([
      //     releaseMonitorQueue,
      //     constraintsQueue,
      //     chaindataQueue,
      //     blockQueue,
      //   ]);
      // }
      //
      // const obliterateQueues = false;
      // if (obliterateQueues) {
      //   await otvWorker.queues.obliterateQueues([
      //     releaseMonitorQueue,
      //     constraintsQueue,
      //     chaindataQueue,
      //     blockQueue,
      //   ]);
      // }
      //
      // // Add repeatable jobs to the queues
      // // Queues need to have different repeat time intervals
      // await otvWorker.queues.addReleaseMonitorJob(releaseMonitorQueue, 60000);
      // await otvWorker.queues.addValidityJob(constraintsQueue, 1000001);
      // await otvWorker.queues.addScoreJob(constraintsQueue, 100002);
      // await otvWorker.queues.addActiveValidatorJob(chaindataQueue, 100003);
      // await otvWorker.queues.addEraPointsJob(chaindataQueue, 100006);
      // await otvWorker.queues.addEraStatsJob(chaindataQueue, 110008);
      // await otvWorker.queues.addInclusionJob(chaindataQueue, 100008);
      // await otvWorker.queues.addNominatorJob(chaindataQueue, 100009);
      // await otvWorker.queues.addSessionKeyJob(chaindataQueue, 100010);
      // await otvWorker.queues.addValidatorPrefJob(chaindataQueue, 100101);
      // await otvWorker.queues.addAllBlocks(blockQueue, chaindata);
      // TODO update this as queue job
      // await startLocationStatsJob(this.config, this.chaindata);
    } catch (e) {
      logger.error(JSON.stringify(e), scorekeeperLabel);
      logger.error("Error starting microservice jobs", scorekeeperLabel);
    }
  };
}
