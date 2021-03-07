import { CronJob } from "cron";
import Db from "./db";
import { config } from "node:process";
import {
  CLEAR_OFFLINE_CRON,
  MONITOR_CRON,
  SIXTEEN_HOURS,
  VALIDITY_CRON,
} from "./constants";
import logger from "./logger";
import Monitor from "./monitor";
import { Config } from "./config";
import { OTV } from "./constraints";

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
