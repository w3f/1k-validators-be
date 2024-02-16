/**
 * Functions for staring Scorekeeper jobs
 *
 * @function ScorekeeperJobs
 */

import {
  startCancelCron,
  startExecutionJob,
  startRewardClaimJob,
  startStaleNominationCron,
  startUnclaimedEraJob,
} from "../../cron";

/**
 * Orchestrates the initiation of various jobs related to scorekeeping in a blockchain context. This function
 * sequentially starts a set of asynchronous tasks, including execution, unclaimed era processing, reward claiming
 * (conditional on the presence of a claimer), and the management of stale nominations and cron jobs. It is designed
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
 * @param {Object} claimer - An optional object responsible for claiming rewards. If present, the reward claiming
 *                           job will be initiated; otherwise, it will be skipped.
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
 * const claimer = new RewardClaimer();
 * const chaindata = new ChainData(); // Assume ChainData is a class with necessary methods
 *
 * await startScorekeeperJobs(handler, nominatorGroups, config, bot, claimer, chaindata);
 */
export const startScorekeeperJobs = async (
  handler,
  nominatorGroups,
  config,
  bot,
  claimer,
  chaindata,
): Promise<any> => {
  await startExecutionJob(handler, nominatorGroups, config, bot);

  await startUnclaimedEraJob(config, chaindata);
  if (claimer) {
    await startRewardClaimJob(config, handler, claimer, chaindata, bot);
  }
  await startCancelCron(config, handler, nominatorGroups, chaindata, bot);
  await startStaleNominationCron(
    config,
    handler,
    nominatorGroups,
    chaindata,
    bot,
  );
};