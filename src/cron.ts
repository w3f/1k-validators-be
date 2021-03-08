import { CronJob } from "cron";
import Db from "./db";
import { config } from "node:process";
import {
  CLEAR_OFFLINE_CRON,
  EXECUTION_CRON,
  MONITOR_CRON,
  SIXTEEN_HOURS,
  TIME_DELAY_BLOCKS,
  VALIDITY_CRON,
} from "./constants";
import logger from "./logger";
import Monitor from "./monitor";
import { Config } from "./config";
import { OTV } from "./constraints";
import ApiHandler from "./ApiHandler";
import Nominator from "./nominator";

// Monitors the latest GitHub releases and ensures nodes have upgraded
// within a timely period.
export const startMonitorJob = async (config: Config, db: Db) => {
  const monitorFrequency = config.cron.monitor
    ? config.cron.monitor
    : MONITOR_CRON;

  logger.info(
    `(cron::startMonitorJob) Starting Monitor Cron Job with frequency ${monitorFrequency}`
  );

  // TODO: Change this to be determined by upgrade priority
  const monitor = new Monitor(db, SIXTEEN_HOURS);

  const monitorCron = new CronJob(monitorFrequency, async () => {
    logger.info(
      `{Start} Monitoring the node version by polling latst GitHub releases every ${
        config.global.test ? "three" : "fifteen"
      } minutes.`
    );
    await monitor.getLatestTaggedRelease();
    await monitor.ensureUpgrades();
  });

  await monitor.getLatestTaggedRelease();
  await monitor.ensureUpgrades();
  monitorCron.start();
};

// Once a week reset the offline accumulations of nodes.
export const startClearAccumulatedOfflineTimeJob = async (
  config: Config,
  db: Db
) => {
  const clearFrequency = config.cron.clearOffline
    ? config.cron.clearOffline
    : CLEAR_OFFLINE_CRON;
  logger.info(
    `(cron::startClearAccumlatedOfflineTimeJob) Starting Clear Accumulated Offline Time Job with frequency ${clearFrequency}`
  );

  const clearCron = new CronJob(clearFrequency, () => {
    logger.info(`(cron::clearOffline) Running clear offline cron`);
    db.clearAccumulated();
  });
  clearCron.start();
};

export const startValidatityJob = async (
  config: Config,
  db: Db,
  constraints: OTV
) => {
  const validityFrequency = config.cron.validity
    ? config.cron.validity
    : VALIDITY_CRON;
  logger.info(
    `(cron::startValidityJob) Starting Validity Job with frequency ${validityFrequency}`
  );

  const validityCron = new CronJob(validityFrequency, async () => {
    logger.info(`(cron::Validity) Running validity cron`);
    const allCandidates = await db.allCandidates();

    const identityHashTable = await constraints.populateIdentityHashTable(
      allCandidates
    );

    // set invalidityReason for stashes
    const invalid = await constraints.getInvalidCandidates(
      allCandidates,
      identityHashTable
    );
    for (const i of invalid) {
      const { stash, reason } = i;
      await db.setInvalidityReason(stash, reason);
    }

    // set invalidityReason as empty for valid candidates
    const valid = await constraints.getValidCandidates(
      allCandidates,
      identityHashTable
    );
    for (const v of valid) {
      const { stash } = v;
      await db.setInvalidityReason(stash, "");
    }
  });
  validityCron.start();
};

// Executes any avaible time delay proxy txs if the the current block
// is past the time delay proxy amount. This is a parameter `timeDelayBlocks` which can be
// specified in the config, otherwise defaults the constant of 10850 (~18 hours).
// Runs every 15 minutesB
export const startExecutionJob = async (
  handler: ApiHandler,
  nominatorGroups: Array<Nominator[]>,
  config: Config,
  db: Db,
  constraints: OTV
) => {
  const timeDelayBlocks = config.proxy.timeDelayBlocks
    ? Number(config.proxy.timeDelayBlocks)
    : Number(TIME_DELAY_BLOCKS);
  const executionFrequency = config.cron.execution
    ? config.cron.execution
    : EXECUTION_CRON;
  logger.info(
    `(cron::startExecutionJob) Starting Execution Job with frequency ${executionFrequency} and time delay of ${timeDelayBlocks} blocks`
  );

  const executionCron = new CronJob(executionFrequency, async () => {
    logger.info(`(cron::Execution) Running execution cron`);
    const api = await handler.getApi();
    const currentBlock = await api.rpc.chain.getBlock();
    const { number } = currentBlock.block.header;

    const allDelayed = await db.getAllDelayedTxs();

    for (const data of allDelayed) {
      const { number: dataNum, controller, targets } = data;

      const shouldExecute =
        dataNum + Number(timeDelayBlocks) <= number.toNumber();

      if (shouldExecute) {
        logger.info(
          `(cron::Execution) tx first announced at block ${dataNum} is ready to execute. Executing....`
        );
        // time to execute
        // find the nominator
        const nomGroup = nominatorGroups.find((nomGroup) => {
          return !!nomGroup.find((nom) => {
            return nom.controller == controller;
          });
        });

        const nominator = nomGroup.find((nom) => nom.controller == controller);

        const innerTx = api.tx.staking.nominate(targets);
        const tx = api.tx.proxy.proxyAnnounced(
          nominator.address,
          controller,
          "Staking", // TODO: Add dynamic check for  proxy type - if the proxy type isn't a "Staking" proxy, the tx will fail
          innerTx
        );
        await nominator.sendStakingTx(tx, targets);
        await db.deleteDelayedTx(dataNum, controller);
      }
    }
  });
  executionCron.start();
};
