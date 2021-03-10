import { CronJob } from "cron";
import { ApiPromise } from "@polkadot/api";
import { bnToBn } from "@polkadot/util";

import ApiHandler from "./ApiHandler";
import ChainData from "./chaindata";
import { Config, NominatorConfig } from "./config";
import {
  FIFTY_KSM,
  KUSAMA_FOUR_DAYS_ERAS,
  POLKADOT_FOUR_DAYS_ERAS,
  SCOREKEEPER_CRON,
  TEN_PERCENT,
  TEN_THOUSAND_DOT,
  THREE_PERCENT,
} from "./constants";
import { OTV } from "./constraints";
import Db from "./db";
import logger from "./logger";
import Nominator from "./nominator";
import { CandidateData, Stash } from "./types";
import { formatAddress, getNow, sleep, toDecimals } from "./util";
import { startExecutionJob, startValidatityJob } from "./cron";

type NominatorGroup = NominatorConfig[];

type SpawnedNominatorGroup = Nominator[];

export const autoNumNominations = async (
  api: ApiPromise,
  nominator: Nominator
): Promise<number> => {
  const stash = await nominator.stash();
  const stashAccount = await api.query.system.account(stash);
  const stashBal = stashAccount.data.free.toBn();
  const validators = await api.derive.staking.electedInfo();
  validators.info.sort((a, b) => {
    if (a.exposure.total && b.exposure.total) {
      a.exposure.total.toBn().sub(b.exposure.total.toBn()).isNeg() ? -1 : 1;
    } else {
      logger.warn(`{autoNominations} error, no exposure for ${a} or ${b}`);
      return 1;
    }
  });

  return Math.min(
    Math.floor(
      stashBal
        .div(validators.info[0].exposure.total.toBn())
        .mul(bnToBn(1.05))
        .toNumber()
    ),
    16
  );
};

export default class ScoreKeeper {
  public handler: ApiHandler;
  public bot: any;
  public chaindata: ChainData;
  public config: Config;
  public constraints: OTV;
  public currentEra = 0;
  public currentTargets: string[];
  public db: Db;

  private ending = false;
  private nominatorGroups: Array<SpawnedNominatorGroup> = [];

  constructor(handler: ApiHandler, db: Db, config: Config, bot: any = false) {
    this.handler = handler;
    this.db = db;
    this.chaindata = new ChainData(this.handler);

    // For every staking reward event, create an accounting record of the amount rewarded
    this.handler.on(
      "reward",
      async (data: { stash: string; amount: string }) => {
        const { stash, amount } = data;
        for (const nomGroup of this.nominatorGroups) {
          for (const nom of nomGroup) {
            const nomStash = await nom.stash();
            if (nomStash == stash) {
              const activeEra = await this.chaindata.getActiveEraIndex();
              await this.db.updateAccountingRecord(
                nom.controller,
                nomStash,
                activeEra.toString(),
                amount
              );
            }
          }
        }
      }
    );

    this.config = config;
    this.bot = bot;
    this.constraints = new OTV(
      this.handler,
      this.config.constraints.skipConnectionTime,
      this.config.constraints.skipIdentity,
      this.config.constraints.skipStakedDestination,
      this.config.constraints.skipClientUpgrade,
      this.config.global.networkPrefix == 2 ? FIFTY_KSM : TEN_THOUSAND_DOT,
      this.config.global.networkPrefix == 2 ? TEN_PERCENT : THREE_PERCENT,
      this.config.global.networkPrefix == 2
        ? KUSAMA_FOUR_DAYS_ERAS
        : POLKADOT_FOUR_DAYS_ERAS
    );
  }

  getAllNominatorGroups(): SpawnedNominatorGroup[] {
    return this.nominatorGroups;
  }

  getAllNominatorControllers(): string[] {
    const controllers = [];
    for (const group of this.nominatorGroups) {
      controllers.push(...group.map((n) => n.controller));
    }

    return controllers;
  }

  getNominatorGroupAtIndex(index: number): SpawnedNominatorGroup {
    if (index < 0 || index >= this.nominatorGroups.length) {
      throw new Error("Index out of bounds.");
    }

    // eslint-disable-next-line security/detect-object-injection
    return this.nominatorGroups[index];
  }

  async botLog(msg: string): Promise<void> {
    if (this.bot) {
      await this.bot.sendMessage(msg);
    }
  }

  /// Spawns a new nominator.
  _spawn(cfg: NominatorConfig, networkPrefix = 2): Nominator {
    return new Nominator(this.handler, this.db, cfg, networkPrefix);
  }

  // Adds nominators from the config
  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    const group = [];
    const now = getNow();
    for (const nomCfg of nominatorGroup) {
      const nom = this._spawn(nomCfg, this.config.global.networkPrefix);
      await this.db.addNominator(nom.controller, now);
      // Create a new accounting record in case one doesn't exist.
      const stash = await nom.stash();
      await this.db.newAccountingRecord(stash, nom.controller);
      group.push(nom);
    }
    this.nominatorGroups.push(group);

    logger.info(
      `Nominator group added! Nominator addresses (Controller / Stash):`
    );
    group.map(async (n) => {
      const stash = await n.stash();
      logger.info(`- ${n.controller} / ${stash}`);
    });

    await this.botLog(
      `Nominator group added! Nominator addresses (Controller / Stash):`
    );
    group.map(async (n) => {
      const stash = await n.stash();
      await this.botLog(`- ${n.controller} / ${stash}`);
    });

    return true;
  }

  // Begin the main workflow of the scorekeeper
  async begin(): Promise<void> {
    logger.info(`(Scorekeeper::begin) Starting Scorekeeper.`);

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      logger.info(
        `(Scorekeeper::begin) Force Round: ${this.config.scorekeeper.forceRound} starting round....`
      );
      await this.startRound();
    }

    // Main cron job for starting rounds and ending rounds of the scorekeeper
    const scoreKeeperFrequency = this.config.cron.scorekeeper
      ? this.config.cron.scorekeeper
      : SCOREKEEPER_CRON;
    const mainCron = new CronJob(scoreKeeperFrequency, async () => {
      logger.info(
        `(Scorekeeper::mainCron) Running mainCron of Scorekeeper with frequency ${scoreKeeperFrequency}`
      );

      if (this.ending) {
        logger.info(`(Scorekeeper::mainCron) ROUND IS CURRENTLY ENDING.`);
        return;
      }

      const [activeEra, err] = await this.chaindata.getActiveEraIndex();
      if (err) {
        logger.warn(`CRITICAL: ${err}`);
        return;
      }

      const {
        lastNominatedEraIndex,
      } = await this.db.getLastNominatedEraIndex();

      // For Kusama, Nominations will happen every 4 eras
      // For Polkadot, Nominations will happen every era
      const eraBuffer = this.config.global.networkPrefix == 0 ? 1 : 4;

      const isNominationRound =
        Number(lastNominatedEraIndex) <= activeEra - eraBuffer;

      if (isNominationRound) {
        logger.info(
          `(Scorekeeper::mainCron) Last nomination was in era ${lastNominatedEraIndex}. Current era is ${activeEra}. This is a nomination round.`
        );
        if (!this.nominatorGroups) {
          logger.info(
            "(Scorekeeper::mainCron) No nominators spawned. Skipping round."
          );
          return;
        }

        if (!this.config.scorekeeper.nominating) {
          logger.info(
            "(Scorekeeper::mainCron) Nominating is disabled in the settings. Skipping round."
          );
          return;
        }

        // Get all the current targets to check if this should just be a starting round or if the round needs ending
        const allCurrentTargets = [];
        for (const nomGroup of this.nominatorGroups) {
          for (const nominator of nomGroup) {
            // Get the current nominations of an address
            const currentTargets = await this.db.getCurrentTargets(
              nominator.controller
            );
            allCurrentTargets.push(currentTargets);
          }
        }
        this.currentTargets = allCurrentTargets;

        if (!this.currentTargets) {
          logger.info(
            "(Scorekeeper::mainCron) Current Targets is empty. Starting round."
          );
          await this.startRound();
        } else {
          logger.info(
            `(Scorekeeper::mainCron) Current Targets: ${this.currentTargets}. Ending round.`
          );
          await this.endRound();
          await this.startRound();
        }
      }
    });

    startValidatityJob(this.config, this.db, this.constraints);
    startExecutionJob(
      this.handler,
      this.nominatorGroups,
      this.config,
      this.db,
      this.constraints
    );
    mainCron.start();
  }

  /// Handles the beginning of a new round.
  // - Gets the current era
  // - Gets all valid candidates
  // - Nominates valid candidates
  // - Sets this current era to the era a nomination round took place in.
  async startRound(): Promise<string[]> {
    const now = new Date().getTime();

    // The nominations sent now won't be active until the next era.
    this.currentEra = await this._getCurrentEra();

    logger.info(
      `(Scorekeeper::startRound) New round starting at ${now} for next Era ${
        this.currentEra + 1
      }`
    );
    this.botLog(
      `New round is starting! Era ${this.currentEra} will begin new nominations.`
    );

    const allCandidates = await this.db.allCandidates();
    const identityHashTable = await this.constraints.populateIdentityHashTable(
      allCandidates
    );

    const validCandidates = await this.constraints.getValidCandidates(
      allCandidates,
      identityHashTable
    );

    const targets = await this._doNominations(
      validCandidates,
      this.nominatorGroups
    );

    await this.db.setLastNominatedEraIndex(this.currentEra);

    return targets;
  }

  // Start nominations for all nominator groups:
  // - For each nominator group - if they have current targets, wipe them
  // - Determine the number of nominations to make for each nominator account
  //     - This will either be a static number, or "auto"
  async _doNominations(
    candidates: CandidateData[],
    nominatorGroups: SpawnedNominatorGroup[] = [],
    dryRun = false
  ): Promise<string[]> {
    const allTargets = candidates.map((c) => c.stash);
    let counter = 0;
    for (const nomGroup of nominatorGroups) {
      for (const nominator of nomGroup) {
        // The number of nominations to do per nominator account
        // This is either hard coded, or set to "auto", meaning it will find a dynamic amount of validators
        //    to nominate based on the lowest staked validator in the validator set
        const numNominations =
          nominator.maxNominations == "auto"
            ? await (async () => {
                const api = await this.chaindata.handler.getApi();
                return autoNumNominations(api, nominator);
              })()
            : nominator.maxNominations;

        // Get the target slice based on the amount of nominations to do and increment the counter.
        const targets = allTargets.slice(counter, counter + numNominations);
        counter = counter + numNominations;

        await nominator.nominate(targets, dryRun || this.config.global.dryRun);

        // Wait some time between each transaction to avoid nonce issues.
        await sleep(8000);

        logger.info(`Nominator ${nominator.controller} nominated:`);
        targets.map(async (target) => {
          const name = (await this.db.getCandidate(target)).name;
          logger.info(`- ${name} (${target})`);
        });

        this.botLog(`Nominator ${nominator.controller} nominated:`);
        targets.map(async (target) => {
          const name = (await this.db.getCandidate(target)).name;
          await this.botLog(`- ${name} (${target})`);
        });
      }
    }
    logger.info(
      `(Scorekeeper::_doNominations) Number of Validators nominated this round: ${counter}`
    );
    this.botLog(`${counter} Validators nominated this round`);

    this.currentTargets = allTargets.slice(0, counter);
    const nextTargets = allTargets.slice(counter, allTargets.length);

    logger.info(
      `Next targets: \n${nextTargets
        .map(
          async (target) =>
            `- ${(await this.db.getCandidate(target)).name} (${target})`
        )
        .join("\n")}`
    );

    this.botLog(`Next targets: \n`);

    nextTargets.map(async (target) => {
      const name = (await this.db.getCandidate(target)).name;
      await this.botLog(`- ${name} (${target})`);
    });

    logger.info(`Next targets: \n`);

    nextTargets.map(async (target) => {
      const name = (await this.db.getCandidate(target)).name;
      logger.info(`- ${name} (${target})`);
    });

    return allTargets;
  }

  async _getCurrentEra(): Promise<number> {
    const [eraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }
    return eraIndex;
  }

  /**
   * Handles the ending of a Nomination round.
   */
  async endRound(): Promise<void> {
    this.ending = true;
    logger.info("(Scorekeeper::endRound) Ending round");

    // The targets that have already been processed for this round.
    const toProcess: Map<Stash, CandidateData> = new Map();

    const {
      lastNominatedEraIndex: startEra,
    } = await this.db.getLastNominatedEraIndex();

    const [activeEra, err] = await this.chaindata.getActiveEraIndex();
    if (err) {
      throw new Error(`Error getting active era: ${err}`);
    }

    const chainType = await this.db.getChainMetadata();

    logger.info(
      `(Scorekeeper::endRound) finding validators that were active from era ${startEra} to ${activeEra}`
    );
    const [
      activeValidators,
      err2,
    ] = await this.chaindata.activeValidatorsInPeriod(
      Number(startEra),
      activeEra,
      chainType.name
    );
    if (err2) {
      throw new Error(`Error getting active validators: ${err2}`);
    }

    // Get all the candidates we want to process this round
    // TODO: change this to all valid validators - not just ones that we nominated
    for (const nomGroup of this.nominatorGroups) {
      for (const nominator of nomGroup) {
        const current = await this.db.getCurrentTargets(nominator.controller);

        // If not nominating any... then return.
        if (!current.length) {
          logger.info(`${nominator.controller} is not nominating any targets.`);
          continue;
        }

        // Wipe targets.
        // await this.db.clearCurrent(nominator.controller);

        for (const stash of current) {
          const candidate = await this.db.getCandidate(stash);

          // if we already have, don't add it again
          if (toProcess.has(stash)) continue;
          toProcess.set(stash, candidate);
        }
      }
    }

    // Get the set of Good Validators and get the set of Bad validators
    const [good, bad] = await this.constraints.processCandidates(
      new Set(toProcess.values())
    );

    // For all the good validators, check if they were active in the set for the time period
    //     - If they were active, increase their rank
    for (const goodOne of good.values()) {
      const { stash } = goodOne;
      const wasActive =
        activeValidators.indexOf(formatAddress(stash, this.config)) !== -1;

      // if it wasn't active we will not increase the point
      if (!wasActive) {
        logger.info(
          `${stash} was not active during eras ${startEra} to ${activeEra}`
        );
        continue;
      }

      // They were active - increase their rank and add a rank event
      await this.db.pushRankEvent(stash, startEra, activeEra);
      await this.addPoint(stash);
    }

    // For all bad validators, dock their points and create a "Fault Event"
    for (const badOne of bad.values()) {
      const { candidate, reason } = badOne;
      const { stash } = candidate;
      await this.db.pushFaultEvent(stash, reason);
      await this.dockPoints(stash);
    }

    this.ending = false;
  }

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash): Promise<boolean> {
    logger.info(
      `(Scorekeeper::dockPoints) Stash ${stash} did BAD, docking points`
    );

    await this.db.dockPoints(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(`${candidate.name} docked points. New rank: ${candidate.rank}`);

    return true;
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash): Promise<boolean> {
    logger.info(
      `(Scorekeeper::addPoint) Stash ${stash} did GOOD, adding points`
    );

    await this.db.addPoint(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(
      `${candidate.name} did GOOD! Adding a point. New rank: ${candidate.rank}`
    );

    return true;
  }
}
