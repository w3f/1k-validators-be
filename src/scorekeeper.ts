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
  TEN_PERCENT,
  TEN_THOUSAND_DOT,
  THREE_PERCENT,
} from "./constants";
import { OTV } from "./constraints";
import Db from "./db";
import logger from "./logger";
import Nominator from "./nominator";
import { CandidateData, Stash } from "./types";
import { getNow, sleep, toDecimals } from "./util";

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

    await this.botLog(
      `Nominator group added! Nominator addresses: ${group
        .map((n) => n.controller)
        .join(" ")}`
    );

    return true;
  }

  async begin(): Promise<void> {
    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      await this.startRound();
    }

    const validityCron = new CronJob("0 0-59/7 * * * *", async () => {
      const allCandidates = await this.db.allCandidates();

      const identityHashTable = await this.constraints.populateIdentityHashTable(
        allCandidates
      );

      // set invalidityReason for stashes
      const invalid = await this.constraints.getInvalidCandidates(
        allCandidates,
        identityHashTable
      );
      for (const i of invalid) {
        const { stash, reason } = i;
        await this.db.setInvalidityReason(stash, reason);
      }

      // set invalidityReason as empty for valid candidates
      const valid = await this.constraints.getValidCandidates(
        allCandidates,
        identityHashTable
      );
      for (const v of valid) {
        const { stash } = v;
        await this.db.setInvalidityReason(stash, "");
      }
    });

    const executionCron = new CronJob("0 0-59/15 * * * *", async () => {
      const api = await this.handler.getApi();
      const currentBlock = await api.rpc.chain.getBlock();
      const { number } = currentBlock.block.header;

      const allDelayed = await this.db.getAllDelayedTxs();

      for (const data of allDelayed) {
        const { number: dataNum, controller, targets } = data;
        if (dataNum + 10850 <= number.toNumber()) {
          // time to execute
          // find the nominator
          const nomGroup = this.nominatorGroups.find((nomGroup) => {
            return !!nomGroup.find((nom) => {
              return nom.controller == controller;
            });
          });

          const nominator = nomGroup.find(
            (nom) => nom.controller == controller
          );

          const innerTx = api.tx.staking.nominate(targets);
          const tx = api.tx.proxy.proxyAnnounced(
            nominator.address,
            controller,
            "Staking",
            innerTx
          );
          await this.db.deleteDelayedTx(dataNum, controller);
          await nominator.sendStakingTx(tx, targets);

          const era = (await api.query.staking.activeEra()).toJSON()["index"];
          const decimals = (await this.db.getChainMetadata()).decimals;
          const bonded = toDecimals(
            (await api.query.staking.ledger(controller)).toJSON()["active"],
            decimals
          );
          await this.db.setNomination(controller, era, targets, bonded);
        }
      }
    });

    const mainCron = new CronJob("0 0-59/10 * * * *", async () => {
      if (this.ending) {
        logger.info(`ROUND IS CURRENTLY ENDING.`);
        return;
      }

      const [activeEra, err] = await this.chaindata.getActiveEraIndex();
      if (err) {
        logger.info(`CRITICAL: ${err}`);
        return;
      }

      const {
        lastNominatedEraIndex,
      } = await this.db.getLastNominatedEraIndex();

      const eraBuffer = this.config.global.networkPrefix == 0 ? 1 : 4;

      if (Number(lastNominatedEraIndex) <= activeEra - eraBuffer) {
        if (!this.nominatorGroups) {
          logger.info("No nominators spawned. Skipping round.");
          return;
        }

        if (!this.config.scorekeeper.nominating) {
          logger.info(
            "Nominating is disabled in the settings. Skipping round."
          );
          return;
        }

        if (!this.currentTargets) {
          await this.startRound();
        } else {
          await this.endRound();
          await this.startRound();
        }
      }
    });

    validityCron.start();
    executionCron.start();
    mainCron.start();
  }

  /// Handles the beginning of a new round.
  async startRound(): Promise<string[]> {
    const now = new Date().getTime();

    // The nominations sent now won't be active until the next era.
    this.currentEra = await this._getCurrentEra();

    logger.info(
      `New round starting at ${now} for next Era ${this.currentEra + 1}`
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

  async _doNominations(
    candidates: CandidateData[],
    nominatorGroups: SpawnedNominatorGroup[] = [],
    dryRun = false
  ): Promise<string[]> {
    const allTargets = candidates.map((c) => c.stash);
    for (const nomGroup of nominatorGroups) {
      let counter = 0;
      for (const nominator of nomGroup) {
        const currentTargets = await this.db.getCurrentTargets(
          nominator.controller
        );

        if (!!currentTargets.length) {
          logger.info("Wiping the old targets before making new nominations.");
          await this.db.clearCurrent(nominator.controller);
        }

        const numNominations =
          nominator.maxNominations == "auto"
            ? await (async () => {
                const api = await this.chaindata.handler.getApi();
                return autoNumNominations(api, nominator);
              })()
            : nominator.maxNominations;

        const targets = allTargets.slice(counter, counter + numNominations);
        counter = counter + numNominations;

        await nominator.nominate(targets, dryRun || this.config.global.dryRun);

        // Wait some time between each transaction to avoid nonce issues.
        await sleep(8000);

        this.botLog(
          `Nominator ${nominator.controller} nominated ${targets.join(" ")}`
        );
      }
    }
    this.currentTargets = allTargets;
    this.botLog(
      `Next targets: \n${allTargets.map((target) => `- ${target}`).join("\n")}`
    );

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
    logger.info("Ending round");

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

    for (const nomGroup of this.nominatorGroups) {
      for (const nominator of nomGroup) {
        const current = await this.db.getCurrentTargets(nominator.controller);

        // If not nominating any... then return.
        if (!current.length) {
          logger.info(`${nominator.controller} is not nominating any targets.`);
          continue;
        }

        // Wipe targets.
        await this.db.clearCurrent(nominator.controller);

        for (const stash of current) {
          const candidate = await this.db.getCandidate(stash);

          // if we already have, don't add it again
          if (toProcess.has(stash)) continue;
          toProcess.set(stash, candidate);
        }
      }
    }

    const [good, bad] = await this.constraints.processCandidates(
      new Set(toProcess.values())
    );

    for (const goodOne of good.values()) {
      const { stash } = goodOne;
      const wasActive = activeValidators.indexOf(stash) !== -1;

      // if it wasn't active we will not increase the point
      if (!wasActive) {
        logger.info(
          `${stash} was not active during eras ${startEra} to ${activeEra}`
        );
        continue;
      }

      await this.db.pushRankEvent(stash, startEra, activeEra);
      await this.addPoint(stash);
    }

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
    logger.info(`Stash ${stash} did BAD, docking points`);

    await this.db.dockPoints(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(`${candidate.name} docked points. New rank: ${candidate.rank}`);

    return true;
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash): Promise<boolean> {
    logger.info(`Stash ${stash} did GOOD, adding points`);

    await this.db.addPoint(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(
      `${candidate.name} did GOOD! Adding a point. New rank: ${candidate.rank}`
    );

    return true;
  }
}
