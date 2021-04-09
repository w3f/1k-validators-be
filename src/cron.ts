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
  CANDIDATE_CHAINDATA_CRON,
  REWARD_CLAIMING_THRESHOLD,
  REWARD_CLAIMING_CRON,
  CANCEL_CRON,
  STALE_CRON,
} from "./constants";
import logger from "./logger";
import Monitor from "./monitor";
import { Config } from "./config";
import { OTV } from "./constraints";
import ApiHandler from "./ApiHandler";
import Nominator from "./nominator";
import ChainData from "./chaindata";
import Claimer from "./claimer";
import { EraReward } from "./types";
import { addressUrl, sleep, toDecimals } from "./util";
import { exists } from "node:fs";

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
  handler: ApiHandler
) => {
  const validityFrequency = config.cron.validity
    ? config.cron.validity
    : VALIDITY_CRON;
  logger.info(
    `(cron::startValidityJob) Starting Validity Job with frequency ${validityFrequency}`
  );

  let running = false;

  const validityCron = new CronJob(validityFrequency, async () => {
    if (running) return;
    running = true;
    logger.info(`(cron::Validity) Running validity cron`);
    const allCandidates = await db.allCandidates();

    const api = await handler.getApi();
    const currentEra = await api.query.staking.currentEra();

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
      identityHashTable
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

// Chron job for writing chaindata for candidates to the db
// This updates:
//     - Unclaimed eras
export const startCandidateChainDataJob = async (
  config: Config,
  handler: ApiHandler,
  db: Db,
  constraints: OTV,
  chaindata: ChainData
) => {
  const chaindataFrequency = config.cron.candidateChainData
    ? config.cron.candidateChainData
    : CANDIDATE_CHAINDATA_CRON;

  logger.info(
    `(cron::CandidateChainData) Running candidate chain data cron with frequency: ${chaindataFrequency}`
  );

  const api = await handler.getApi();
  let running = false;

  const chaindataCron = new CronJob(chaindataFrequency, async () => {
    if (running) {
      return;
    }
    running = true;
    logger.info(
      `{cron::CandidateChainData} running candidate chain data cron....`
    );
    const start = Date.now();

    // Set Era Points
    logger.info(`{cron::CandidateChainData} setting era info`);
    const [activeEra, err] = await chaindata.getActiveEraIndex();
    for (let i = activeEra - 1; i > activeEra - 84 && i >= 0; i--) {
      const erapoints = await db.getTotalEraPoints(i);

      if (!!erapoints && erapoints.totalEraPoints >= 70000 && erapoints.median) {
        continue;
      } else {
        logger.info(
          `{cron::CandidateChainData} era ${i} point data doesnt exist. Creating....`
        );
        const { era, total, validators } = await chaindata.getTotalEraPoints(i);
        await db.setTotalEraPoints(era, total, validators);
      }
    }
    const { era, total, validators } = await chaindata.getTotalEraPoints(
      activeEra
    );
    await db.setTotalEraPoints(era, total, validators);

    const allCandidates = await db.allCandidates();

    // The current active validators in the validator set.
    const activeValidators = await chaindata.currentValidators();

    // All queued keyes
    const queuedKeys = await chaindata.getQueuedKeys();

    for (const [i, candidate] of allCandidates.entries()) {
      const startLoop = Date.now();

      // Set Identity
      const identity = await chaindata.getFormattedIdentity(candidate.stash);
      await db.setIdentity(candidate.stash, identity);

      // Set Commission
      const [commission, err] = await chaindata.getCommission(candidate.stash);
      const formattedCommission =
        commission == 0 ? 0 : commission / Math.pow(10, 7);
      await db.setCommission(candidate.stash, formattedCommission);

      // Set Controller
      const controller = await chaindata.getControllerFromStash(
        candidate.stash
      );
      await db.setController(candidate.stash, controller);

      // Set inclusion Rate
      const erasActive = await db.getHistoryDepthEraPoints(
        candidate.stash,
        activeEra
      );
      const filteredEras = erasActive.filter((era) => era.eraPoints > 0);
      const inclusion = Number(filteredEras.length / 84);
      await db.setInclusion(candidate.stash, inclusion);

      // Set span inclusion Rate
      const spanErasActive = await db.getSpanEraPoints(
        candidate.stash,
        activeEra
      );
      const filteredSpanEras = spanErasActive.filter(
        (era) => era.eraPoints > 0
      );
      const spanInclusion = Number(filteredSpanEras.length / 28);
      await db.setSpanInclusion(candidate.stash, spanInclusion);

      // Set if the validator is active in the set
      const active = activeValidators.includes(candidate.stash);
      await db.setActive(candidate.stash, active);

      // Set unclaimed eras
      const unclaimedEras = await chaindata.getUnclaimedEras(
        candidate.stash,
        db
      );
      await db.setUnclaimedEras(candidate.stash, unclaimedEras);

      // Set reward destination
      const rewardDestination = await chaindata.getRewardDestination(
        candidate.stash
      );
      await db.setRewardDestination(candidate.stash, rewardDestination);

      // Set queued keys
      for (const key of queuedKeys) {
        if (key.address == candidate.stash) {
          await db.setQueuedKeys(candidate.stash, key.keys);
        }
      }

      // Set Next Keys
      const nextKeys = await chaindata.getNextKeys(candidate.stash);
      await db.setNextKeys(candidate.stash, nextKeys);

      const endLoop = Date.now();

      logger.info(
        `{Chaindata::getUnclaimedRewards} ${candidate.stash} (${i + 1}/${
          allCandidates.length
        }) done. Tooks ${(endLoop - startLoop) / 1000} seconds`
      );
      // TODO: add setting commission
      // TODO add setting identity information
    }
    const end = Date.now();

    logger.info(
      `{cron::CandidateChainData} started at ${new Date(
        start
      ).toString()} Done. Took ${(end - start) / 1000} seconds`
    );
    running = false;
  });
  chaindataCron.start();
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
    logger.info(`{Cron::ClaimRewards} Claimer has low free balance: ${free}`);
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
    logger.info(`{cron::CandidateChainData} running reward claiming cron....`);

    const erasToClaim = [];
    const [currentEra, err] = await chaindata.getActiveEraIndex();
    const rewardClaimThreshold =
      config.global.networkPrefix == 2 || config.global.networkPrefix == 0
        ? REWARD_CLAIMING_THRESHOLD
        : 6;
    const claimThreshold = currentEra - rewardClaimThreshold;

    const allCandidates = await db.allCandidates();
    for (const candidate of allCandidates) {
      const unclaimedEras = candidate.unclaimedEras;
      if (!unclaimedEras || unclaimedEras.length == 0) return;
      for (const era of unclaimedEras) {
        if (era < claimThreshold) {
          logger.info(
            `{cron::startRewardClaimJob} added era ${era} for validator ${candidate.stash} to be claimed.`
          );
          const eraReward: EraReward = { era: era, stash: candidate.stash };
          erasToClaim.push(eraReward);
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
