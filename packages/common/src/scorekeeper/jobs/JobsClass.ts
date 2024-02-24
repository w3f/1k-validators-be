import {
  ApiHandler,
  ChainData,
  Config,
  Constraints,
  logger,
} from "../../index";

import { scorekeeperLabel, SpawnedNominatorGroup } from "../scorekeeper";
import {
  startCancelJob,
  startExecutionJob,
  startMainScorekeeperJob,
  startStaleNominationJob,
  startUnclaimedEraJob,
} from "./cron/StartCronJobs";
import EventEmitter from "eventemitter3";

export type jobsMetadata = {
  config: Config.ConfigSchema;
  ending: boolean;
  chaindata: ChainData;
  nominatorGroups: Array<SpawnedNominatorGroup>;
  nominating: boolean;
  currentEra: number;
  bot: any;
  constraints: Constraints.OTV;
  handler: ApiHandler;
  currentTargets: string[];
  jobStatusEmitter: EventEmitter;
};

export interface JobStatus {
  runCount: number;
  updated: number;
  status: "started" | "running" | "finished" | "errored";
  error?: string;
  progress?: number; // Progress from 0 to 100
  iteration?: string; // Name of the current iteration
}

export abstract class Jobs {
  constructor(protected readonly metadata: jobsMetadata) {}

  abstract _startSpecificJobs(): Promise<void>;

  public startJobs = async (): Promise<void> => {
    const {
      handler,
      nominatorGroups,
      config,
      bot,
      chaindata,
      ending,
      nominating,
      currentEra,
      constraints,
      currentTargets,
      jobStatusEmitter,
    } = this.metadata;

    try {
      await this._startSpecificJobs();

      // Start all scorekeeper / core jobs
      await startScorekeeperJobs(this.metadata);
    } catch (e) {
      logger.warn(
        `There was an error running some cron jobs...`,
        scorekeeperLabel,
      );
      logger.error(e);
    }
    logger.info(`going to start mainCron: `, scorekeeperLabel);
    await startMainScorekeeperJob(this.metadata);
  };
}

/**
 * Orchestrates the initiation of various jobs related to scorekeeping in a blockchain context. This function
 * sequentially starts a set of asynchronous tasks, including execution, unclaimed era processing,
 * and the management of stale nominations and cron jobs. It is designed
 * to facilitate the automation of tasks such as monitoring nominator groups, claiming rewards, and cleaning up
 * outdated or irrelevant data.
 *
 * @param {Object} handler - An object responsible for handling various tasks, possibly including communication
 *                           with the blockchain, processing data, or interacting with other services.
 * @param {Array} nominatorGroups - An array of groups or entities involved in nominating validators, which may require
 *                                  specific monitoring or management jobs to be executed.
 * @param {Object} config - The configuration object containing essential parameters and settings for the jobs,
 *                          such as API endpoints, intervals for cron jobs, and other job-specific configurations.
 * @param {Object} bot - An object representing a bot or automated agent, possibly used for notifications,
 *                       alerts, or other interactive tasks related to the jobs being started.
 * @param {Object} chaindata - An object representing the blockchain data required by the jobs, typically including
 *                             methods to query the blockchain state, fetch historical data, etc.
 * @returns {Promise<void>} A promise that resolves when all jobs have been successfully initiated. The promise
 *                          does not return any value upon resolution.
 * @throws {Error} If any job fails to start, the function will catch the error, log it, and the promise will be
 *                 rejected with the error.
 *
 * @example
 * const handler = new TaskHandler();
 * const nominatorGroups = [/* array of nominator groups *\/];
 * const config = { /* configuration details *\/ };
 * const bot = new NotificationBot();
 * const chaindata = new ChainData(); // Assume ChainData is a class with necessary methods
 *
 * await startScorekeeperJobs(handler, nominatorGroups, config, bot, chaindata);
 */
const startScorekeeperJobs = async (metadata: jobsMetadata): Promise<any> => {
  await startExecutionJob(metadata);
  await startUnclaimedEraJob(metadata);
  await startCancelJob(metadata);
  await startStaleNominationJob(metadata);
};
