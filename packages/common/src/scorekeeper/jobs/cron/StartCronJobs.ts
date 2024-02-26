import { CronJob } from "cron";
import { Constants, logger, queries, Util } from "../../..//index";
import { setupCronJob } from "./SetupCronJob";
import { jobsMetadata } from "../JobsClass";
import {
  activeValidatorJobWithTiming,
  blockJobWithTiming,
  eraPointsJobWithTiming,
  eraStatsJobWithTiming,
  getLatestTaggedRelease,
  inclusionJobWithTiming,
  locationStatsJobWithTiming,
  nominatorJobWithTiming,
  scoreJobWithTiming,
  sessionKeyJobWithTiming,
  unclaimedEraJobWithTiming,
  validatorPrefJobWithTiming,
  validityJobWithTiming,
} from "../specificJobs/index";
import { mainScorekeeperJob } from "../specificJobs/MainScorekeeperJob";
import { ConfigSchema } from "../../../config";

// Functions for starting the cron jobs

export const cronLabel = { label: "Cron" };

type JobConfig = {
  scheduleKey: keyof ConfigSchema["cron"];
  enabledKey: keyof ConfigSchema["cron"];
  defaultFrequency: string;
  jobFunction: (metadata: jobsMetadata) => Promise<void>;
  jobName: string;
  preventOverlap?: boolean;
};

export const startJob = async (
  metadata: jobsMetadata,
  jobConfig: JobConfig,
) => {
  const { config } = metadata;
  const {
    scheduleKey = '""',
    enabledKey = "",
    jobFunction,
    jobName,
    preventOverlap = false,
    defaultFrequency,
  } = jobConfig;

  // Check if config.cron exists and use default values if it doesn't
  const isEnabled =
    config.cron && config?.cron[enabledKey] !== undefined
      ? Boolean(config.cron[enabledKey])
      : true;

  const frequency =
    config.cron && config?.cron[scheduleKey] !== undefined
      ? config?.cron[scheduleKey].toString()
      : defaultFrequency;

  if (!isEnabled) {
    logger.warn(`${jobName} is disabled`, cronLabel);
    return;
  }

  await setupCronJob(
    true, // Assuming the job should always be considered "enabled" at this point.
    frequency,
    defaultFrequency,
    () => jobFunction(metadata),
    jobName,
    cronLabel,
    preventOverlap,
  );
};

// Monitors the latest GitHub releases and ensures nodes have upgraded
// within a timely period.
export const startMonitorJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "monitor",
    enabledKey: "monitorEnabled",
    defaultFrequency: Constants.MONITOR_CRON,
    jobFunction: async () => {
      await getLatestTaggedRelease();
    },
    jobName: "Monitor Job",
    preventOverlap: true,
  });
};

// Once a week reset the offline accumulations of nodes.
export const startClearAccumulatedOfflineTimeJob = async (
  metadata: jobsMetadata,
) => {
  await startJob(metadata, {
    scheduleKey: "clearOffline",
    enabledKey: "clearOfflineEnabled",
    defaultFrequency: Constants.CLEAR_OFFLINE_CRON,
    jobFunction: async () => {
      await queries.clearAccumulated();
    },
    jobName: "Clear Offline Job",
  });
};

export const startValidityJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "validity",
    enabledKey: "validityEnabled",
    defaultFrequency: Constants.VALIDITY_CRON,
    jobFunction: async () => {
      await validityJobWithTiming(metadata);
    },
    jobName: "Validity Job",
    preventOverlap: true,
  });
};

// Runs job that updates scores of all validators
export const startScoreJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "score",
    enabledKey: "scoreEnabled",
    defaultFrequency: Constants.SCORE_CRON,
    jobFunction: async () => {
      await scoreJobWithTiming(metadata);
    },
    jobName: "Score Job",
    preventOverlap: true,
  });
};

// Runs job that updates the era stats
export const startEraStatsJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "eraStats",
    enabledKey: "eraStatsEnabled",
    defaultFrequency: Constants.ERA_STATS_CRON,
    jobFunction: async () => {
      await eraStatsJobWithTiming(metadata);
    },
    jobName: "Era Stats Job",
    preventOverlap: true,
  });
};

// Executes any available time delay proxy txs if the current block
// is past the time delay proxy amount. This is a parameter `timeDelayBlocks` which can be
// specified in the config, otherwise defaults the constant of 10850 (~18 hours).
// Runs every 15 minutesB
export const startExecutionJob = async (metadata: jobsMetadata) => {
  const { config, constraints, chaindata, nominatorGroups, bot, handler } =
    metadata;
  const timeDelayBlocks = config.proxy?.timeDelayBlocks
    ? Number(config.proxy?.timeDelayBlocks)
    : Number(Constants.TIME_DELAY_BLOCKS);
  const executionFrequency = config.cron?.execution
    ? config.cron?.execution
    : Constants.EXECUTION_CRON;
  logger.info(
    `Starting Execution Job with frequency ${executionFrequency} and time delay of ${timeDelayBlocks} blocks`,
    cronLabel,
  );

  const executionCron = new CronJob(executionFrequency, async () => {
    logger.info(`Running execution cron`, cronLabel);
    const latestBlock = await chaindata.getLatestBlock();
    const api = await handler.getApi();

    const era = await chaindata.getCurrentEra();

    const allDelayed = await queries.getAllDelayedTxs();

    for (const data of allDelayed) {
      const { number: dataNum, controller, targets, callHash } = data;

      let validCommission = true;

      // find the nominator
      const nomGroup = nominatorGroups.find((nomGroup) => {
        return !!nomGroup.find((nom) => {
          return nom.bondedAddress == controller;
        });
      });
      const nominator = nomGroup.find((nom) => nom.bondedAddress == controller);
      const [bonded, err] = await chaindata.getBondedAmount(nominator.address);

      for (const target of targets) {
        const [commission, err] = await chaindata.getCommission(target);
        if (commission > config.constraints.commission) {
          validCommission = false;
          logger.warn(
            `${target} has invalid commission: ${commission}`,
            cronLabel,
          );
          if (bot) {
            await bot.sendMessage(
              `@room ${target} has invalid commission: ${commission}`,
            );
          }
        }
      }

      if (!validCommission) {
        const announcements = await chaindata.getProxyAnnouncements(
          nominator.address,
        );
        for (const announcement of announcements) {
          if (announcement.callHash == callHash) {
            logger.warn(`Cancelling call with hash: ${callHash}`, cronLabel);
            if (bot) {
              await bot.sendMessage(`Cancelling call with hash: ${callHash}`);
            }
            await nominator.cancelTx(announcement);
          }
        }
      }

      const shouldExecute =
        validCommission && dataNum + Number(timeDelayBlocks) <= latestBlock;

      if (shouldExecute) {
        logger.info(
          `tx first announced at block ${dataNum} is ready to execute. Executing....`,
          cronLabel,
        );

        // time to execute

        const innerTx = api.tx.staking.nominate(targets);
        const tx = api.tx.proxy.proxyAnnounced(
          nominator.address,
          controller,
          "Staking", // TODO: Add dynamic check for  proxy type - if the proxy type isn't a "Staking" proxy, the tx will fail
          innerTx,
        );

        const [didSend, finalizedBlockHash] = await nominator.sendStakingTx(
          tx,
          targets,
        );

        logger.info(
          `sent staking tx: ${didSend} finalizedBlockHash: ${finalizedBlockHash}`,
          cronLabel,
        );

        if (didSend) {
          // Create a Nomination Object
          await queries.setNomination(
            controller,
            era,
            targets,
            bonded,
            finalizedBlockHash,
          );

          // Log Execution
          const validatorsMessage = (
            await Promise.all(
              targets.map(async (n) => {
                const name = await queries.getCandidate(n);
                if (!name) {
                  logger.info(`did send: no entry for :${n}`, cronLabel);
                }
                if (name && !name.name) {
                  logger.info(`did send: no name for :${n}`, cronLabel);
                }
                if (n && name) {
                  return `- ${name.name} (${Util.addressUrl(n, config)})`;
                } else {
                  logger.info(
                    `did send: n: ${n} name: ${JSON.stringify(name)}`,
                    cronLabel,
                  );
                }
              }),
            )
          ).join("<br>");
          const validatorsHtml = (
            await Promise.all(
              targets.map(async (n) => {
                const name = await queries.getCandidate(n);
                if (name) {
                  return `- ${name.name} (${Util.addressUrl(n, config)})`;
                } else {
                  return `- ${JSON.stringify(
                    name,
                  )} (Invalid name!) (${Util.addressUrl(n, config)})`;
                }
              }),
            )
          ).join("<br>");
          const message = `${Util.addressUrl(
            nominator.address,
            config,
          )} executed announcement in finalized block #${finalizedBlockHash} annouced at #${dataNum} \n Validators Nominated:\n ${validatorsMessage}`;
          logger.info(message);
          if (bot) {
            await bot.sendMessage(
              `${Util.addressUrl(
                nominator.address,
                config,
              )} executed announcement in finalized block #${finalizedBlockHash} announced at block #${dataNum} <br> Validators Nominated:<br> ${validatorsHtml}`,
            );
          }

          await queries.deleteDelayedTx(dataNum, controller);
        }
        await Util.sleep(7000);
      }
    }
  });
  executionCron.start();
};

export const startCancelJob = async (metadata: jobsMetadata) => {
  const { config, bot, constraints, chaindata, nominatorGroups } = metadata;
  const cancelFrequency = config.cron?.cancel
    ? config.cron?.cancel
    : Constants.CANCEL_CRON;

  logger.info(
    `Running cancel cron with frequency: ${cancelFrequency}`,
    cronLabel,
  );

  const cancelCron = new CronJob(cancelFrequency, async () => {
    logger.info(`running cancel cron....`, cronLabel);

    const latestBlock = await chaindata.getLatestBlock();
    const threshold = latestBlock - 1.2 * config.proxy.timeDelayBlocks;

    for (const nomGroup of nominatorGroups) {
      for (const nom of nomGroup) {
        const isProxy = nom.isProxy;
        if (isProxy) {
          const announcements = await chaindata.getProxyAnnouncements(
            nom.address,
          );

          for (const announcement of announcements) {
            // If there are any specific announcements to cancel, try to cancel them,
            //     so long as they are registered on chain
            const blacklistedAnnouncements =
              config.proxy.blacklistedAnnouncements;
            if (blacklistedAnnouncements) {
              for (const blacklistedAnnouncement of blacklistedAnnouncements) {
                logger.info(
                  `there is a blacklisted announcement to cancel: ${blacklistedAnnouncement}`,
                  cronLabel,
                );
                if (bot) {
                  // await bot.sendMessage(
                  //   `{CancelCron::cancel} there is a blacklisted announcement to cancel: ${blacklistedAnnouncement}`
                  // );
                }

                // If the blacklisted announcement matches what's registered on chain, cancel it
                if (announcement.callHash == blacklistedAnnouncement) {
                  logger.info(
                    `cancelling ${announcement.callHash} - ${blacklistedAnnouncement}`,
                  );
                  const didCancel = await nom.cancelTx(announcement);
                  if (didCancel) {
                    const successfulCancelMessage = `{CancelCron::cancel} ${blacklistedAnnouncement} was successfully cancelled.`;
                    logger.info(successfulCancelMessage);
                    // await bot.sendMessage(successfulCancelMessage);
                  }
                } else {
                  logger.info(
                    `announcement call hash: ${announcement.callHash} does not match ${blacklistedAnnouncement}`,
                  );
                }
              }
            }

            // if it is too old, cancel it
            if (announcement.height < threshold) {
              await Util.sleep(10000);
              logger.info(
                `announcement at ${announcement.height} is older than threshold: ${threshold}. Cancelling...`,
                cronLabel,
              );
              const didCancel = await nom.cancelTx(announcement);
              if (didCancel) {
                logger.info(
                  `announcement from ${announcement.real} at ${announcement.height} was older than ${threshold} and has been cancelled`,
                  cronLabel,
                );
                if (bot) {
                  await bot.sendMessage(
                    `Proxy announcement from ${Util.addressUrl(
                      announcement.real,
                      config,
                    )} at #${
                      announcement.height
                    } was older than #${threshold} and has been cancelled`,
                  );
                }
              }
              await Util.sleep(10000);
            }
          }
        }
      }
    }
  });
  cancelCron.start();
};

export const startStaleNominationJob = async (metadata: jobsMetadata) => {
  const { config, constraints, chaindata, bot, handler, nominatorGroups } =
    metadata;
  const staleFrequency = config.cron?.stale
    ? config.cron?.stale
    : Constants.STALE_CRON;

  logger.info(
    `Running stale nomination cron with frequency: ${staleFrequency}`,
    cronLabel,
  );
  const api = await handler.getApi();

  // threshold for a stale nomination - 8 eras for kusama, 2 eras for polkadot
  const threshold = config.global.networkPrefix == 2 ? 8 : 2;
  const staleCron = new CronJob(staleFrequency, async () => {
    logger.info(`running stale cron....`, cronLabel);

    const currentEra = await api.query.staking.currentEra();
    const allCandidates = await queries.allCandidates();

    for (const nomGroup of nominatorGroups) {
      for (const nom of nomGroup) {
        const stash = await nom.stash();
        if (!stash || stash == "0x") continue;
        const nominators = await api.query.staking.nominators(stash);
        if (!nominators.toJSON()) continue;

        const submittedIn = nominators.toJSON()["submittedIn"];
        const targets = nominators.toJSON()["targets"];

        for (const target of targets) {
          const isCandidate = allCandidates.filter(
            (candidate) => candidate.stash == target,
          );

          if (!isCandidate) {
            const message = `Nominator ${stash} is nominating ${target}, which is not a 1kv candidate`;
            logger.info(message);
            if (bot) {
              await bot.sendMessage(message);
            }
          }
        }

        if (submittedIn < Number(currentEra) - threshold) {
          const message = `Nominator ${stash} has a stale nomination. Last nomination was in era ${submittedIn} (it is now era ${currentEra})`;
          logger.info(message, cronLabel);
          if (bot) {
            await bot.sendMessage(message);
          }
        }
      }
    }
  });
  staleCron.start();
};

// Chain data querying cron jobs

// Chron job for writing era points
export const startEraPointsJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "eraPoints",
    enabledKey: "eraPointsEnabled",
    defaultFrequency: Constants.ERA_POINTS_CRON,
    jobFunction: async () => {
      await eraPointsJobWithTiming(metadata);
    },
    jobName: "Era Points Job",
    preventOverlap: true,
  });
};

// Chron job for writing the active validators in the set
export const startActiveValidatorJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "activeValidator",
    enabledKey: "activeValidatorEnabled",
    defaultFrequency: Constants.ACTIVE_VALIDATOR_CRON,
    jobFunction: async () => {
      await activeValidatorJobWithTiming(metadata);
    },
    jobName: "Active Validator Job",
    preventOverlap: true,
  });
};
// Chron job for updating inclusion rates
export const startInclusionJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "inclusion",
    enabledKey: "inclusionEnabled",
    defaultFrequency: Constants.INCLUSION_CRON,
    jobFunction: async () => {
      await inclusionJobWithTiming(metadata);
    },
    jobName: "Inclusion Job",
    preventOverlap: true,
  });
};

// Chron job for updating session keys
export const startSessionKeyJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "sessionKey",
    enabledKey: "sessionKeyEnabled",
    defaultFrequency: Constants.SESSION_KEY_CRON,
    jobFunction: async () => {
      await sessionKeyJobWithTiming(metadata);
    },
    jobName: "Session Key Job",
    preventOverlap: true,
  });
};

// Chron job for updating unclaimed eras
export const startUnclaimedEraJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "unclaimedEras",
    enabledKey: "unclaimedErasEnabled",
    defaultFrequency: Constants.UNCLAIMED_ERAS_CRON,
    jobFunction: async () => {
      await unclaimedEraJobWithTiming(metadata);
    },
    jobName: "Unclaimed Era Job",
    preventOverlap: true,
  });
};

// Chron job for updating validator preferences
export const startValidatorPrefJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "validatorPref",
    enabledKey: "validatorPrefEnabled",
    defaultFrequency: Constants.VALIDATOR_PREF_CRON,
    jobFunction: async () => {
      await validatorPrefJobWithTiming(metadata);
    },
    jobName: "Validator Pref Job",
    preventOverlap: true,
  });
};

export const startLocationStatsJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "locationStats",
    enabledKey: "locationStatsEnabled",
    defaultFrequency: Constants.LOCATION_STATS_CRON,
    jobFunction: async () => {
      await locationStatsJobWithTiming(metadata);
    },
    jobName: "Location Stats Job",
    preventOverlap: true,
  });
};

export const startNominatorJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "nominator",
    enabledKey: "nominatorEnabled",
    defaultFrequency: Constants.NOMINATOR_CRON,
    jobFunction: async () => {
      await nominatorJobWithTiming(metadata);
    },
    jobName: "Nominator Job",
    preventOverlap: true,
  });
};

export const startBlockDataJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "block",
    enabledKey: "blockEnabled",
    defaultFrequency: Constants.BLOCK_CRON,
    jobFunction: async () => {
      await blockJobWithTiming(metadata);
    },
    jobName: "Block Data Job",
    preventOverlap: true,
  });
};

export const startMainScorekeeperJob = async (metadata: jobsMetadata) => {
  await startJob(metadata, {
    scheduleKey: "scorekeeper",
    enabledKey: "scorekeeperEnabled",
    defaultFrequency: Constants.SCOREKEEPER_CRON,
    jobFunction: async () => {
      await mainScorekeeperJob(metadata);
    },
    jobName: "Main Scorekeeper Job",
    preventOverlap: false,
  });
};
