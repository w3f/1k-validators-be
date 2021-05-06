import { CronJob } from "cron";
import Db from "./db";
import {
  CLEAR_OFFLINE_CRON,
  EXECUTION_CRON,
  MONITOR_CRON,
  SIXTEEN_HOURS,
  TIME_DELAY_BLOCKS,
  VALIDITY_CRON,
  REWARD_CLAIMING_THRESHOLD,
  REWARD_CLAIMING_CRON,
  CANCEL_CRON,
  STALE_CRON,
  ERA_POINTS_CRON,
  ACTIVE_VALIDATOR_CRON,
  INCLUSION_CRON,
  UNCLAIMED_ERAS_CRON,
  VALIDATOR_PREF_CRON,
  SESSION_KEY_CRON,
} from "./constants";
import logger from "./logger";
import Monitor from "./monitor";
import { Config } from "./config";
import { OTV } from "./constraints";
import ApiHandler from "./ApiHandler";
import Nominator from "./nominator";
import ChainData from "./chaindata";
import Claimer from "./claimer";
import { CandidateData, EraReward } from "./types";
import { addressUrl, sleep, toDecimals } from "./util";
import {
  activeValidatorJob,
  eraPointsJob,
  inclusionJob,
  sessionKeyJob,
  unclaimedErasJob,
  validatorPrefJob,
} from "./jobs";

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
  constraints: OTV,
  chaindata: ChainData,
  allCandidates: any[]
) => {
  const validityFrequency = config.cron.validity
    ? config.cron.validity
    : VALIDITY_CRON;
  logger.info(
    `(cron::startValidityJob::init) Starting Validity Job with frequency ${validityFrequency}`
  );

  let running = false;

  const validityCron = new CronJob(validityFrequency, async () => {
    const start = Date.now();
    if (running) return;
    running = true;
    logger.info(`(cron::Validity::start) Running validity cron`);

    const currentEra = await chaindata.getCurrentEra();

    const activeCandidates = allCandidates.filter(
      (candidate) => candidate.active
    );

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
      identityHashTable,
      db
    );
    for (const v of valid) {
      const { stash } = v;
      await db.setInvalidityReason(stash, "");
      await db.setLastValid(stash);
    }
    await db.setEraStats(
      Number(currentEra),
      allCandidates.length,
      valid.length,
      activeCandidates.length
    );
    const end = Date.now();

    logger.info(
      `{cron::Validity::ExecutionTime} started at ${new Date(
        start
      ).toString()} Done. Took ${(end - start) / 1000} seconds`
    );

    running = false;
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
  bot: any
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
        await sleep(10000);
        const didSend = await nominator.sendStakingTx(tx, targets);
        // Sleep to prevent usurped txs
        await sleep(10000);
        if (didSend) {
          // Log Execution
          const validatorsMessage = (
            await Promise.all(
              targets.map(async (n) => {
                const name = await db.getCandidate(n);
                return `- ${name.name} (${addressUrl(n, config)})`;
              })
            )
          ).join("<br>");
          const validatorsHtml = (
            await Promise.all(
              targets.map(async (n) => {
                const name = await db.getCandidate(n);
                return `- ${name.name} (${addressUrl(n, config)})`;
              })
            )
          ).join("<br>");
          const message = `${addressUrl(
            nominator.address,
            config
          )} executed announcement that was announced at block #${dataNum} \n Validators Nominated:\n ${validatorsMessage}`;
          logger.info(message);
          if (bot) {
            await bot.sendMessage(
              `${addressUrl(
                nominator.address,
                config
              )} executed announcement that was announced at block #${dataNum} <br> Validators Nominated:<br> ${validatorsHtml}`
            );
          }

          await db.deleteDelayedTx(dataNum, controller);
        }
      }
    }
  });
  executionCron.start();
};

// Chron job for claiming rewards
export const startRewardClaimJob = async (
  config: Config,
  handler: ApiHandler,
  db: Db,
  claimer: Claimer,
  chaindata: ChainData,
  bot: any
) => {
  if (config.constraints.skipClaiming) return;
  const rewardClaimingFrequency = config.cron.rewardClaiming
    ? config.cron.rewardClaiming
    : REWARD_CLAIMING_CRON;

  logger.info(
    `(cron::RewardClaiming) Running reward claiming cron with frequency: ${rewardClaimingFrequency}`
  );

  // Check the free balance of the account. If it doesn't have a free balance, skip.
  const balance = await chaindata.getBalance(claimer.address);
  const metadata = await db.getChainMetadata();
  const network = metadata.name.toLowerCase();
  const free = toDecimals(Number(balance.free), metadata.decimals);
  // TODO Parameterize this as a constant
  if (free < 0.5) {
    logger.info(`{Cron::RewardClaiming} Claimer has low free balance: ${free}`);
    bot.sendMessage(
      `Reward Claiming Account ${addressUrl(
        claimer.address,
        config
      )} has low free balance: ${free}`
    );
    return;
  }

  const api = await handler.getApi();

  const rewardClaimingCron = new CronJob(rewardClaimingFrequency, async () => {
    const erasToClaim = [];
    const [currentEra, err] = await chaindata.getActiveEraIndex();
    const rewardClaimThreshold =
      config.global.networkPrefix == 2 || config.global.networkPrefix == 0
        ? REWARD_CLAIMING_THRESHOLD
        : 6;
    const claimThreshold = Number(currentEra - rewardClaimThreshold);

    logger.info(
      `{cron::RewardClaiming} running reward claiming cron with threshold of ${rewardClaimThreshold} eras. Going to try to claim rewards before era ${claimThreshold} (current era: ${currentEra})....`
    );

    const allCandidates = await db.allCandidates();
    for (const candidate of allCandidates) {
      if (candidate.unclaimedEras) {
        for (const era of candidate.unclaimedEras) {
          logger.info(
            `{cron::RewardClaiming} checking era ${era} for ${candidate.name} if it's before era ${claimThreshold}...`
          );
          if (era < claimThreshold) {
            logger.info(
              `{cron::startRewardClaimJob} added era ${era} for validator ${candidate.stash} to be claimed.`
            );
            const eraReward: EraReward = { era: era, stash: candidate.stash };
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
  config: Config,
  handler: ApiHandler,
  db: Db,
  nominatorGroups: Array<Nominator[]>,
  chaindata: ChainData,
  bot: any
) => {
  const cancelFrequency = config.cron.cancel ? config.cron.cancel : CANCEL_CRON;

  logger.info(
    `(cron::Cancel) Running cancel cron with frequency: ${cancelFrequency}`
  );

  const cancelCron = new CronJob(cancelFrequency, async () => {
    logger.info(`{cron::cancel} running cancel cron....`);

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
            if (announcement.height < threshold) {
              await sleep(10000);
              logger.info(
                `{CancelCron::cancel} announcement at ${announcement.height} is older than threshold: ${threshold}. Cancelling...`
              );
              const didCancel = await nom.cancelTx(announcement);
              if (didCancel) {
                logger.info(
                  `{CancelCron::cancel} announcement from ${announcement.real} at ${announcement.height} was older than ${threshold} and has been cancelled`
                );
                if (bot) {
                  bot.sendMessage(
                    `Proxy announcement from ${addressUrl(
                      announcement.real,
                      config
                    )} at #${
                      announcement.height
                    } was older than #${threshold} and has been cancelled`
                  );
                }
              }
              await sleep(10000);
            }
          }
        }
      }
    }
  });
  cancelCron.start();
};

export const startStaleNominationCron = async (
  config: Config,
  handler: ApiHandler,
  db: Db,
  nominatorGroups: Array<Nominator[]>,
  chaindata: ChainData,
  bot: any
) => {
  const staleFrequency = config.cron.stale ? config.cron.stale : STALE_CRON;

  logger.info(
    `(cron::Stale) Running stale nomination cron with frequency: ${staleFrequency}`
  );
  const api = await handler.getApi();

  // threshold for a stale nomination - 8 eras for kusama, 2 eras for polkadot
  const threshold = config.global.networkPrefix == 2 ? 8 : 2;
  const staleCron = new CronJob(staleFrequency, async () => {
    logger.info(`{cron::stale} running stale cron....`);

    const currentEra = await api.query.staking.currentEra();
    const allCandidates = await db.allCandidates();

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
              bot.sendMessage(message);
            }
          }
        }

        if (submittedIn < Number(currentEra) - threshold) {
          const message = `Nominator ${stash} has a stale nomination. Last nomination was in era ${submittedIn} (it is now era ${currentEra})`;
          logger.info(message);
          if (bot) {
            bot.sendMessage(message);
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
  config: Config,
  db: Db,
  chaindata: ChainData
) => {
  const eraPointsFrequency = config.cron.eraPoints
    ? config.cron.eraPoints
    : ERA_POINTS_CRON;

  logger.info(
    `(cron::EraPointsJob::init) Running era points job with frequency: ${eraPointsFrequency}`
  );

  let running = false;

  const eraPointsCron = new CronJob(eraPointsFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`{cron::EraPointsJob::start} running era points job....`);

    // Run the Era Points job
    const retries = 0;
    try {
      await eraPointsJob(db, chaindata);
    } catch (e) {
      logger.warn(
        `(cron::EraPointsJob::warn) There was an error running. retries: ${retries}`
      );
    }

    running = false;
  });
  eraPointsCron.start();
};

// Chron job for writing the active validators in the set
export const startActiveValidatorJob = async (
  config: Config,
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const activeValidatorFrequency = config.cron.activeValidator
    ? config.cron.activeValidator
    : ACTIVE_VALIDATOR_CRON;

  logger.info(
    `(cron::ActiveValidatorJob::init) Running active validator job with frequency: ${activeValidatorFrequency}`
  );

  let running = false;

  const activeValidatorCron = new CronJob(
    activeValidatorFrequency,
    async () => {
      if (running) {
        return;
      }
      running = true;
      logger.info(
        `{cron::ActiveValidatorJob::start} running era points job....`
      );

      // Run the active validators job
      await activeValidatorJob(db, chaindata, candidates);
      running = false;
    }
  );
  activeValidatorCron.start();
};

// Chron job for updating inclusion rates
export const startInclusionJob = async (
  config: Config,
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const inclusionFrequency = config.cron.inclusion
    ? config.cron.inclusion
    : INCLUSION_CRON;

  logger.info(
    `(cron::InclusionJob::init) Running inclusion job with frequency: ${inclusionFrequency}`
  );

  let running = false;

  const inclusionCron = new CronJob(inclusionFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`{cron::InclusionJob::start} running inclusion job....`);

    // Run the active validators job
    await inclusionJob(db, chaindata, candidates);
    running = false;
  });
  inclusionCron.start();
};

// Chron job for updating session keys
export const startSessionKeyJob = async (
  config: Config,
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const sessionKeyFrequency = config.cron.sessionKey
    ? config.cron.sessionKey
    : SESSION_KEY_CRON;

  logger.info(
    `(cron::SessionKeyJob::init) Running sesion key job with frequency: ${sessionKeyFrequency}`
  );

  let running = false;

  const sessionKeyCron = new CronJob(sessionKeyFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(`{cron::SessionKeyJob::start} running session key job....`);

    // Run the active validators job
    await sessionKeyJob(db, chaindata, candidates);
    running = false;
  });
  sessionKeyCron.start();
};

// Chron job for updating unclaimed eras
export const startUnclaimedEraJob = async (
  config: Config,
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const unclaimedErasFrequency = config.cron.unclaimedEras
    ? config.cron.unclaimedEras
    : UNCLAIMED_ERAS_CRON;

  logger.info(
    `(cron::UnclaimedEraJob::init) Running unclaimed era job with frequency: ${unclaimedErasFrequency}`
  );

  let running = false;

  const unclaimedErasCron = new CronJob(unclaimedErasFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(
      `{cron::UnclaimedEraJob::start} running unclaimed eras job....`
    );

    // Run the active validators job
    await unclaimedErasJob(db, chaindata, candidates);
    running = false;
  });
  unclaimedErasCron.start();
};

// Chron job for updating validator preferences
export const startValidatorPrefJob = async (
  config: Config,
  db: Db,
  chaindata: ChainData,
  candidates: any[]
) => {
  const validatorPrefFrequency = config.cron.validatorPref
    ? config.cron.validatorPref
    : VALIDATOR_PREF_CRON;

  logger.info(
    `(cron::ValidatorPrefJob::init) Running validator pref cron with frequency: ${validatorPrefFrequency}`
  );

  let running = false;

  const validatorPrefCron = new CronJob(validatorPrefFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(
      `{cron::ValidatorPrefJob::start} running validator pref job....`
    );

    // Run the active validators job
    await validatorPrefJob(db, chaindata, candidates);
    running = false;
  });
  validatorPrefCron.start();
};
