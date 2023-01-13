import { CronJob } from "cron";
import Nominator from "./nominator";
import {
  ApiHandler,
  ChainData,
  Constants,
  logger,
  Types,
  Util,
  queries,
  Config,
  Constraints,
} from "@1kv/common";
import Claimer from "./claimer";
import {
  activeValidatorJob,
  eraPointsJob,
  eraStatsJob,
  inclusionJob,
  monitorJob,
  scoreJob,
  sessionKeyJob,
  validatorPrefJob,
  validityJob,
  locationStatsJob,
  councilJob,
  democracyJob,
  nominatorJob,
  delegationJob,
} from "./jobs";
import { blockDataJob } from "@1kv/worker/build/jobs";

export const cronLabel = { label: "Cron" };

// Monitors the latest GitHub releases and ensures nodes have upgraded
// within a timely period.
export const startMonitorJob = async (config: Config.ConfigSchema) => {
  const monitorFrequency = config.cron.monitor
    ? config.cron.monitor
    : Constants.MONITOR_CRON;

  logger.info(
    `Starting Monitor Cron Job with frequency ${monitorFrequency}`,
    cronLabel
  );

  const monitorCron = new CronJob(monitorFrequency, async () => {
    logger.info(
      `Monitoring the node version by polling latst GitHub releases every ${
        config.global.test ? "three" : "fifteen"
      } minutes.`,
      cronLabel
    );
    await monitorJob();
  });

  monitorCron.start();
};

// Once a week reset the offline accumulations of nodes.
export const startClearAccumulatedOfflineTimeJob = async (
  config: Config.ConfigSchema
) => {
  const clearFrequency = config.cron.clearOffline
    ? config.cron.clearOffline
    : Constants.CLEAR_OFFLINE_CRON;
  logger.info(
    `Starting Clear Accumulated Offline Time Job with frequency ${clearFrequency}`,
    cronLabel
  );

  const clearCron = new CronJob(clearFrequency, () => {
    logger.info(`Running clear offline cron`, cronLabel);
    queries.clearAccumulated();
  });
  clearCron.start();
};

export const startValidatityJob = async (
  config: Config.ConfigSchema,
  constraints: Constraints.OTV
) => {
  const validityFrequency = config.cron.validity
    ? config.cron.validity
    : Constants.VALIDITY_CRON;
  logger.info(
    `Starting Validity Job with frequency ${validityFrequency}`,
    cronLabel
  );

  let running = false;

  const validityCron = new CronJob(validityFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    const hasFinished = await validityJob(constraints);
    if (hasFinished) {
      running = false;
    }
  });
  validityCron.start();
};

// Runs job that updates scores of all validators
export const startScoreJob = async (
  config: Config.ConfigSchema,
  constraints: Constraints.OTV
) => {
  const scoreFrequency = config.cron.score
    ? config.cron.score
    : Constants.SCORE_CRON;
  logger.info(`Starting Score Job with frequency ${scoreFrequency}`, cronLabel);

  let running = false;

  const scoreCron = new CronJob(scoreFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    const hasFinished = await scoreJob(constraints);
    if (hasFinished) {
      running = false;
    }
  });
  scoreCron.start();
};

// Runs job that updates the era stats
export const startEraStatsJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const eraStatsFrequency = config.cron.eraStats
    ? config.cron.eraStats
    : Constants.ERA_STATS_CRON;
  logger.info(
    `Starting Era Stats Job with frequency ${eraStatsFrequency}`,
    cronLabel
  );

  let running = false;

  const eraStatsCron = new CronJob(eraStatsFrequency, async () => {
    if (running) {
      return;
    }
    running = true;

    const hasFinished = await eraStatsJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  eraStatsCron.start();
};

// Executes any available time delay proxy txs if the current block
// is past the time delay proxy amount. This is a parameter `timeDelayBlocks` which can be
// specified in the config, otherwise defaults the constant of 10850 (~18 hours).
// Runs every 15 minutesB
export const startExecutionJob = async (
  handler: ApiHandler,
  nominatorGroups: Array<Nominator[]>,
  config: Config.ConfigSchema,
  bot: any
) => {
  const timeDelayBlocks = config.proxy.timeDelayBlocks
    ? Number(config.proxy.timeDelayBlocks)
    : Number(Constants.TIME_DELAY_BLOCKS);
  const executionFrequency = config.cron.execution
    ? config.cron.execution
    : Constants.EXECUTION_CRON;
  logger.info(
    `Starting Execution Job with frequency ${executionFrequency} and time delay of ${timeDelayBlocks} blocks`,
    cronLabel
  );

  const executionCron = new CronJob(executionFrequency, async () => {
    logger.info(`Running execution cron`, cronLabel);
    const api = await handler.getApi();
    const currentBlock = await api.rpc.chain.getBlock();
    const { number } = currentBlock.block.header;

    const allDelayed = await queries.getAllDelayedTxs();

    for (const data of allDelayed) {
      const { number: dataNum, controller, targets } = data;

      const shouldExecute =
        dataNum + Number(timeDelayBlocks) <= number.toNumber();

      if (shouldExecute) {
        logger.info(
          `tx first announced at block ${dataNum} is ready to execute. Executing....`,
          cronLabel
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

        const [didSend, finalizedBlockHash] = await nominator.sendStakingTx(
          tx,
          targets
        );

        logger.info(
          `sent staking tx: ${didSend} finalizedBlockHash: ${finalizedBlockHash}`,
          cronLabel
        );

        if (didSend) {
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
                    cronLabel
                  );
                }
              })
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
                    name
                  )} (Invalid name!) (${Util.addressUrl(n, config)})`;
                }
              })
            )
          ).join("<br>");
          const message = `${Util.addressUrl(
            nominator.address,
            config
          )} executed announcement in finalized block #${finalizedBlockHash} annouced at #${dataNum} \n Validators Nominated:\n ${validatorsMessage}`;
          logger.info(message);
          if (bot) {
            await bot.sendMessage(
              `${Util.addressUrl(
                nominator.address,
                config
              )} executed announcement in finalized block #${finalizedBlockHash} announced at block #${dataNum} <br> Validators Nominated:<br> ${validatorsHtml}`
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

// Chron job for claiming rewards
export const startRewardClaimJob = async (
  config: Config.ConfigSchema,
  handler: ApiHandler,
  claimer: Claimer,
  chaindata: ChainData,
  bot: any
) => {
  if (config.constraints.skipClaiming) return;
  const rewardClaimingFrequency = config.cron.rewardClaiming
    ? config.cron.rewardClaiming
    : Constants.REWARD_CLAIMING_CRON;

  logger.info(
    `Running reward claiming cron with frequency: ${rewardClaimingFrequency}`,
    cronLabel
  );

  // Check the free balance of the account. If it doesn't have a free balance, skip.
  const balance = await chaindata.getBalance(claimer.address);
  const metadata = await queries.getChainMetadata();
  const free = Util.toDecimals(Number(balance.free), metadata.decimals);
  // TODO Parameterize this as a constant
  if (free < 0.5) {
    logger.warn(
      `{Cron::RewardClaiming} Claimer has low free balance: ${free}`,
      cronLabel
    );
    await bot.sendMessage(
      `Reward Claiming Account ${Util.addressUrl(
        claimer.address,
        config
      )} has low free balance: ${free}`
    );
    return;
  }

  const rewardClaimingCron = new CronJob(rewardClaimingFrequency, async () => {
    const erasToClaim = [];
    const [currentEra] = await chaindata.getActiveEraIndex();
    const rewardClaimThreshold =
      config.global.networkPrefix == 2
        ? Constants.KUSAMA_REWARD_THRESHOLD
        : Constants.POLKADOT_REWARD_THRESHOLD;
    const claimThreshold = Number(currentEra - rewardClaimThreshold);

    logger.info(
      ` running reward claiming cron with threshold of ${rewardClaimThreshold} eras. Going to try to claim rewards before era ${claimThreshold} (current era: ${currentEra})....`,
      cronLabel
    );

    const allCandidates = await queries.allCandidates();
    for (const candidate of allCandidates) {
      if (candidate.unclaimedEras) {
        for (const era of candidate.unclaimedEras) {
          logger.info(
            `checking era ${era} for ${candidate.name} if it's before era ${claimThreshold}...`,
            cronLabel
          );
          if (era < claimThreshold) {
            logger.info(
              `added era ${era} for validator ${candidate.stash} to be claimed.`,
              cronLabel
            );
            const eraReward: Types.EraReward = {
              era: era,
              stash: candidate.stash,
            };
            erasToClaim.push(eraReward);
          }
        }
      }
    }
    if (erasToClaim.length > 0) {
      await claimer.claim(erasToClaim);
    }
  });
  rewardClaimingCron.start();
};

export const startCancelCron = async (
  config: Config.ConfigSchema,
  handler: ApiHandler,
  nominatorGroups: Array<Nominator[]>,
  chaindata: ChainData,
  bot: any
) => {
  const cancelFrequency = config.cron.cancel
    ? config.cron.cancel
    : Constants.CANCEL_CRON;

  logger.info(
    `Running cancel cron with frequency: ${cancelFrequency}`,
    cronLabel
  );

  const cancelCron = new CronJob(cancelFrequency, async () => {
    logger.info(`running cancel cron....`, cronLabel);

    const latestBlock = await chaindata.getLatestBlock();
    const threshold = latestBlock - 2 * config.proxy.timeDelayBlocks;

    for (const nomGroup of nominatorGroups) {
      for (const nom of nomGroup) {
        const isProxy = nom.isProxy;
        if (isProxy) {
          const announcements = await chaindata.getProxyAnnouncements(
            nom.address
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
                  cronLabel
                );
                if (bot) {
                  await bot.sendMessage(
                    `{CancelCron::cancel} there is a blacklisted announcement to cancel: ${blacklistedAnnouncement}`
                  );
                }

                // If the blacklisted announcement matches what's registered on chain, cancel it
                if (announcement.callHash == blacklistedAnnouncement) {
                  const didCancel = await nom.cancelTx(announcement);
                  if (didCancel) {
                    const successfulCancelMessage = `{CancelCron::cancel} ${blacklistedAnnouncement} was successfully cancelled.`;
                    logger.info(successfulCancelMessage);
                    await bot.sendMessage(successfulCancelMessage);
                  }
                }
              }
            }

            // if it is too old, cancel it
            if (announcement.height < threshold) {
              await Util.sleep(10000);
              logger.info(
                `announcement at ${announcement.height} is older than threshold: ${threshold}. Cancelling...`,
                cronLabel
              );
              const didCancel = await nom.cancelTx(announcement);
              if (didCancel) {
                logger.info(
                  `announcement from ${announcement.real} at ${announcement.height} was older than ${threshold} and has been cancelled`,
                  cronLabel
                );
                if (bot) {
                  await bot.sendMessage(
                    `Proxy announcement from ${Util.addressUrl(
                      announcement.real,
                      config
                    )} at #${
                      announcement.height
                    } was older than #${threshold} and has been cancelled`
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

export const startStaleNominationCron = async (
  config: Config.ConfigSchema,
  handler: ApiHandler,
  nominatorGroups: Array<Nominator[]>,
  chaindata: ChainData,
  bot: any
) => {
  const staleFrequency = config.cron.stale
    ? config.cron.stale
    : Constants.STALE_CRON;

  logger.info(
    `Running stale nomination cron with frequency: ${staleFrequency}`,
    cronLabel
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
            (candidate) => candidate.stash == target
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
export const startEraPointsJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const eraPointsFrequency = config.cron.eraPoints
    ? config.cron.eraPoints
    : Constants.ERA_POINTS_CRON;

  logger.info(
    `Running era points job with frequency: ${eraPointsFrequency}`,
    cronLabel
  );

  let running = false;

  const eraPointsCron = new CronJob(eraPointsFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running era points job....`, cronLabel);

    // Run the Era Points job
    const retries = 0;
    try {
      const hasFinished = await eraPointsJob(chaindata);
      if (hasFinished) {
        running = false;
      }
    } catch (e) {
      logger.warn(`There was an error running. retries: ${retries}`, cronLabel);
    }
  });
  eraPointsCron.start();
};

// Chron job for writing the active validators in the set
export const startActiveValidatorJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const activeValidatorFrequency = config.cron.activeValidator
    ? config.cron.activeValidator
    : Constants.ACTIVE_VALIDATOR_CRON;

  logger.info(
    `Running active validator job with frequency: ${activeValidatorFrequency}`,
    cronLabel
  );

  let running = false;

  const activeValidatorCron = new CronJob(
    activeValidatorFrequency,
    async () => {
      if (running) {
        return;
      }
      running = true;
      logger.info(`running era points job....`, cronLabel);
      // Run the active validators job
      const hasFinished = await activeValidatorJob(chaindata);
      if (hasFinished) {
        running = false;
      }
    }
  );
  activeValidatorCron.start();
};

// Chron job for updating inclusion rates
export const startInclusionJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const inclusionFrequency = config.cron.inclusion
    ? config.cron.inclusion
    : Constants.INCLUSION_CRON;

  logger.info(
    `Running inclusion job with frequency: ${inclusionFrequency}`,
    cronLabel
  );

  let running = false;

  const inclusionCron = new CronJob(inclusionFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running inclusion job....`, cronLabel);

    // Run the active validators job
    const hasFinished = await inclusionJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  inclusionCron.start();
};

// Chron job for updating session keys
export const startSessionKeyJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const sessionKeyFrequency = config.cron.sessionKey
    ? config.cron.sessionKey
    : Constants.SESSION_KEY_CRON;

  logger.info(
    `Running sesion key job with frequency: ${sessionKeyFrequency}`,
    cronLabel
  );

  let running = false;

  const sessionKeyCron = new CronJob(sessionKeyFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running session key job....`, cronLabel);

    // Run the active validators job
    const hasFinished = await sessionKeyJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  sessionKeyCron.start();
};

// Chron job for updating unclaimed eras
// export const startUnclaimedEraJob = async (
//   config: Config.ConfigSchema,
//   db: Db,
//   chaindata: ChainData
// ) => {
//   const unclaimedErasFrequency = config.cron.unclaimedEras
//     ? config.cron.unclaimedEras
//     : Constants.UNCLAIMED_ERAS_CRON;
//
//   logger.info(
//     `(cron::UnclaimedEraJob::init) Running unclaimed era job with frequency: ${unclaimedErasFrequency}`
//   );
//
//   let running = false;
//
//   const unclaimedErasCron = new CronJob(unclaimedErasFrequency, async () => {
//     if (running) {
//       return;
//     }
//     running = true;
//     logger.info(
//       `{cron::UnclaimedEraJob::start} running unclaimed eras job....`
//     );
//
//     const candidates = await db.allCandidates();
//
//     // Run the active validators job
//     const unclaimedEraThreshold =
//       config.global.networkPrefix == 2
//         ? Constants.KUSAMA_FOUR_DAYS_ERAS
//         : Constants.POLKADOT_FOUR_DAYS_ERAS;
//     await unclaimedErasJob(db, chaindata, candidates, unclaimedEraThreshold);
//     running = false;
//   });
//   unclaimedErasCron.start();
// };

// Chron job for updating validator preferences
export const startValidatorPrefJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const validatorPrefFrequency = config.cron.validatorPref
    ? config.cron.validatorPref
    : Constants.VALIDATOR_PREF_CRON;

  logger.info(
    `Running validator pref cron with frequency: ${validatorPrefFrequency}`,
    cronLabel
  );

  let running = false;

  const validatorPrefCron = new CronJob(validatorPrefFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running validator pref job....`, cronLabel);

    // Run the active validators job
    const hasFinished = await validatorPrefJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  validatorPrefCron.start();
};

// Chron job for storing location stats of nodes
export const startLocationStatsJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const locationStatsFrequency = config.cron.locationStats
    ? config.cron.locationStats
    : Constants.LOCATION_STATS_CRON;

  logger.info(
    `Running location stats cron with frequency: ${locationStatsFrequency}`,
    cronLabel
  );

  let running = false;

  const locationStatsCron = new CronJob(locationStatsFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running location stats job....`, cronLabel);

    // Run the active validators job
    const hasFinished = await locationStatsJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  locationStatsCron.start();
};

// Chron job for council and election info
export const startCouncilJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const councilFrequency = config.cron.council
    ? config.cron.council
    : Constants.COUNCIL_CRON;

  logger.info(
    `Running council cron with frequency: ${councilFrequency}`,
    cronLabel
  );

  let running = false;

  const councilCron = new CronJob(councilFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running council job....`, cronLabel);

    // Run the active validators job
    const hasFinished = await councilJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  councilCron.start();
};

// Chron job for querying subscan data
// export const startSubscanJob = async (
//   config: Config.ConfigSchema,
//   db: Db,
//   subscan: Subscan
// ) => {
//   const subscanFrequency = config.cron.subscan
//     ? config.cron.subscan
//     : Constants.SUBSCAN_CRON;
//
//   logger.info(
//     `(cron::subscanJob::init) Running council cron with frequency: ${subscanFrequency}`
//   );
//
//   let running = false;
//
//   const subscanCron = new CronJob(subscanFrequency, async () => {
//     if (running) {
//       return;
//     }
//     running = true;
//     logger.info(`{cron::subscanJob::start} running subscan job....`);
//
//     const candidates = await db.allCandidates();
//
//     // Run the subscan  job
//     await subscanJob(db, subscan, candidates);
//     running = false;
//   });
//   subscanCron.start();
// };

// Chron job for querying democracy data
export const startDemocracyJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const democracyFrequency = config.cron.democracy
    ? config.cron.democracy
    : Constants.DEMOCRACY_CRON;

  logger.info(
    `Running democracy cron with frequency: ${democracyFrequency}`,
    cronLabel
  );

  let running = false;

  const democracyCron = new CronJob(democracyFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running democracy job....`, cronLabel);

    // Run the democracy  job
    const hasFinished = await democracyJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  democracyCron.start();
};

// Chron job for querying nominator data
export const startNominatorJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const nominatorFrequency = config.cron.nominator
    ? config.cron.nominator
    : Constants.NOMINATOR_CRON;

  logger.info(
    `Running nominator cron with frequency: ${nominatorFrequency}`,
    cronLabel
  );

  let running = false;

  const nominatorCron = new CronJob(nominatorFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running nominator job....`, cronLabel);

    // Run the job
    const hasFinished = await nominatorJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  nominatorCron.start();
};

// Chron job for querying delegator data
export const startDelegationJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const delegationFrequency = config.cron.delegation
    ? config.cron.delegation
    : Constants.DELEGATION_CRON;

  logger.info(
    `Running delegation cron with frequency: ${delegationFrequency}`,
    cronLabel
  );

  let running = false;

  const delegationCron = new CronJob(delegationFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running nominator job....`, cronLabel);

    // Run the job
    const hasFinished = await delegationJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  delegationCron.start();
};

// Chron job for querying delegator data
export const startBlockDataJob = async (
  config: Config.ConfigSchema,
  chaindata: ChainData
) => {
  const blockFrequency = config.cron.block
    ? config.cron.block
    : Constants.BLOCK_CRON;

  logger.info(
    `Running block cron with frequency: ${blockFrequency}`,
    cronLabel
  );

  let running = false;

  const blockCron = new CronJob(blockFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`running block job....`, cronLabel);

    // Run the job
    const hasFinished = await blockDataJob(chaindata);
    if (hasFinished) {
      running = false;
    }
  });
  blockCron.start();

  await blockDataJob(chaindata);
};
