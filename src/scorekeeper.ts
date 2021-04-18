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
  FIVE_THOUSAND_DOT,
  THREE_PERCENT,
} from "./constants";
import { OTV } from "./constraints";
import Db from "./db";
import logger from "./logger";
import Nominator from "./nominator";
import { CandidateData, ClaimerConfig, Stash } from "./types";
import { formatAddress, getNow, sleep, addressUrl, toDecimals } from "./util";
import {
  startCancelCron,
  startCandidateChainDataJob,
  startExecutionJob,
  startRewardClaimJob,
  startStaleNominationCron,
  startValidatityJob,
} from "./cron";
import Claimer from "./claimer";

type NominatorGroup = NominatorConfig[];

type SpawnedNominatorGroup = Nominator[];

export const autoNumNominations = async (
  api: ApiPromise,
  nominator: Nominator
): Promise<number> => {
  const stash = await nominator.stash();
  if (!stash) return 0;
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
      stashBal.div(validators.info[0].exposure.total.toBn()).toNumber()
    ) + 2,
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

  // cacheing all the possible reward destinations for all candidates
  private rewardDestinationCache: string[];

  // Set when the process is ending
  private ending = false;
  // Set when in the process of nominating
  private nominating = false;

  private nominatorGroups: Array<SpawnedNominatorGroup> = [];
  private claimer: Claimer;

  constructor(handler: ApiHandler, db: Db, config: Config, bot: any = false) {
    this.handler = handler;
    this.db = db;
    this.chaindata = new ChainData(this.handler);

    // For every staking reward event, create an accounting record of the amount rewarded
    this.handler.on(
      "reward",
      async (data: { stash: string; amount: string }) => {
        const { stash, amount } = data;

        // check if the address was a candidate, and if so, update their unclaimed eras
        if (this.rewardDestinationCache.includes(stash)) {
          logger.info(
            `{scorekeeper::reward} ${stash} claimed reward of ${amount}. Updating eras....`
          );
          const unclaimedEras = await this.chaindata.getUnclaimedEras(
            stash,
            db
          );
          await db.setUnclaimedEras(stash, unclaimedEras);
        }

        // check if it was a nominator address that earned the reward
        for (const nomGroup of this.nominatorGroups) {
          for (const nom of nomGroup) {
            const nomStash = await nom.stash();
            if (!nomStash) continue;
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

    // Handles offline event. Validators will be faulted for each session they are offline.
    //     If they have already reaceived an offline fault for that session, it is skipped
    this.handler.on("someOffline", async (data: { offlineVals: string[] }) => {
      const { offlineVals } = data;
      const session = await this.chaindata.getSession();
      for (const val of offlineVals) {
        const candidate = await this.db.getCandidate(val);
        if (!candidate) return;
        const reason = `${candidate.name} had an offline event in session ${
          session - 1
        }`;
        let alreadyFaulted = false;
        for (const fault of candidate.faultEvents) {
          if (fault.reason === reason) {
            alreadyFaulted = true;
          }
        }
        if (alreadyFaulted) continue;

        logger.info(`{ScoreKeeper::SomeOffline} ${reason}`);
        await this.botLog(reason);

        await this.db.pushFaultEvent(candidate.stash, reason);
        await this.dockPoints(candidate.stash);
      }
    });

    this.config = config;
    this.bot = bot;
    this.constraints = new OTV(
      this.handler,
      this.config.constraints.skipConnectionTime,
      this.config.constraints.skipIdentity,
      this.config.constraints.skipStakedDestination,
      this.config.constraints.skipClientUpgrade,
      this.config.constraints.skipUnclaimed,
      this.config.global.networkPrefix == 2 ? FIFTY_KSM : FIVE_THOUSAND_DOT,
      this.config.global.networkPrefix == 2 ? TEN_PERCENT : THREE_PERCENT,
      this.config.global.networkPrefix == 2
        ? KUSAMA_FOUR_DAYS_ERAS
        : POLKADOT_FOUR_DAYS_ERAS,
      this.config
    );

    this.populateValid();
    this.populateRewardDestinationCache();
  }

  // Populates the constraints valid cache
  async populateValid(): Promise<void> {
    const allCandidates = await this.db.allCandidates();
    const identityHashTable = await this.constraints.populateIdentityHashTable(
      allCandidates
    );

    const validCandidates = await this.constraints.getValidCandidates(
      allCandidates,
      identityHashTable,
      this.db
    );
  }

  async populateRewardDestinationCache(): Promise<void> {
    const allCandidates = await this.db.allCandidates();
    const rewardAddresses = [];
    for (const candidate of allCandidates) {
      if (!! candidate.rewardDestination && candidate.rewardDestination.length == 48) {
        rewardAddresses.push(candidate.rewardDestination);
        continue;
      }
      rewardAddresses.push(candidate.stash);
      rewardAddresses.push(candidate.controller);
    }

    this.rewardDestinationCache = rewardAddresses;
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

      // try and get the ledger for the nominator - this means it is bonded. If not then don't add it.
      const api = await this.handler.getApi();
      const ledger = await api.query.staking.ledger(nom.controller);
      if (!ledger) {
        logger.info(
          `{Scorekeeper::addNominatorGroup} ${nom.controller} is not bonded, skipping...`
        );
        continue;
      } else {
        await this.db.addNominator(nom.controller, now);
        // Create a new accounting record in case one doesn't exist.
        const stash = await nom.stash();
        await this.db.newAccountingRecord(stash, nom.controller);
        group.push(nom);
      }
    }
    this.nominatorGroups.push(group);

    const nominatorGroupString = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const proxy = (await n._isProxy) ? `/ ${n.address}` : "";
          return `- ${n.controller} / ${stash} ${proxy}`;
        })
      )
    ).join("\n");
    const nominatorGroupStringHtml = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const name = (await this.db.getChainMetadata()).name;
          const decimals = name == "Kusama" ? 12 : 10;
          const [rawBal, err] = await this.chaindata.getBondedAmount(stash);
          const bal = toDecimals(rawBal, decimals);
          const sym = name == "Kusama" ? "KSM" : "DOT";

          const proxy = (await n._isProxy)
            ? `/ ${addressUrl(n.address, this.config)}`
            : "";
          return `- ${addressUrl(n.controller, this.config)} / ${addressUrl(
            stash,
            this.config
          )} (${bal} ${sym}) ${proxy}`;
        })
      )
    ).join("<br>");
    logger.info(
      `Nominator group added! Nominator addresses (Controller / Stash / Proxy):\n${nominatorGroupString}`
    );

    await this.botLog(
      `<h4>Nominator group added! Nominator addresses (Controller / Stash / Proxy):</h4><br> ${nominatorGroupStringHtml}`
    );

    return true;
  }

  // Adds a claimer from the config
  async addClaimer(claimerCfg: ClaimerConfig): Promise<boolean> {
    const claimer = new Claimer(
      this.handler,
      this.db,
      claimerCfg,
      this.config.global.networkPrefix,
      this.bot
    );
    this.claimer = claimer;
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

    startValidatityJob(this.config, this.db, this.constraints, this.handler);
    startCandidateChainDataJob(
      this.config,
      this.handler,
      this.db,
      this.constraints,
      this.chaindata
    );
    if (this.claimer) {
      startRewardClaimJob(
        this.config,
        this.handler,
        this.db,
        this.claimer,
        this.chaindata,
        this.bot
      );
    }
    startExecutionJob(
      this.handler,
      this.nominatorGroups,
      this.config,
      this.db,
      this.bot
    );
    startCancelCron(
      this.config,
      this.handler,
      this.db,
      this.nominatorGroups,
      this.chaindata,
      this.bot
    );
    startStaleNominationCron(
      this.config,
      this.handler,
      this.db,
      this.nominatorGroups,
      this.chaindata,
      this.bot
    );
    mainCron.start();
  }

  /// Handles the beginning of a new round.
  // - Gets the current era
  // - Gets all valid candidates
  // - Nominates valid candidates
  // - Sets this current era to the era a nomination round took place in.
  async startRound(): Promise<string[]> {
    // If this is already in the process of nominating, skip
    if (this.nominating) return;
    this.nominating = true;

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
      identityHashTable,
      this.db
    );

    logger.info(
      `{Scorekeeper::startRound} number of all candidates: ${allCandidates.length} valid candidates: ${validCandidates.length}`
    );

    const numValidatorsNominated = await this._doNominations(
      validCandidates,
      this.nominatorGroups
    );

    if (numValidatorsNominated > 0) {
      logger.info(
        `{Scorekeeper::startRound} ${numValidatorsNominated} nominated this round, setting last nominated era to ${this.currentEra}`
      );
      await this.db.setLastNominatedEraIndex(this.currentEra);
    } else {
      logger.info(
        `{Scorekeeper::startRound} ${numValidatorsNominated} nominated this round, lastNominatedEra not set...`
      );
    }
    this.nominating = false;

    return this.currentTargets;
  }

  // Start nominations for all nominator groups:
  // - For each nominator group - if they have current targets, wipe them
  // - Determine the number of nominations to make for each nominator account
  //     - This will either be a static number, or "auto"
  async _doNominations(
    candidates: CandidateData[],
    nominatorGroups: SpawnedNominatorGroup[] = [],
    dryRun = false
  ): Promise<any> {
    if (candidates.length == 0) {
      logger.info(
        `{ScoreKeeper::_doNominations} Candidates length was 0. Skipping nominations`
      );
      return;
    }
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

        logger.info(
          `{Scorekeepr::_doNominations} ${nominator.address} max nomindations: ${nominator.maxNominations}, number of nominations: ${numNominations}`
        );

        // Check the free balance of the account. If it doesn't have a free balance, skip.
        const balance = await this.chaindata.getBalance(nominator.address);
        const metadata = await this.db.getChainMetadata();
        const network = metadata.name.toLowerCase();
        const free = toDecimals(Number(balance.free), metadata.decimals);
        // TODO Parameterize this as a constant
        if (free < 0.5) {
          logger.info(
            `{Scorekeeper::_doNominations} Nominator has low free balance: ${free}`
          );
          this.botLog(
            `Nominator Account ${addressUrl(
              nominator.address,
              this.config
            )} has low free balance: ${free}`
          );
          continue;
        }

        // Get the target slice based on the amount of nominations to do and increment the counter.
        const targets = allTargets.slice(counter, counter + numNominations);
        counter = counter + numNominations;

        if (targets.length == 0) {
          logger.info(
            `{ScoreKeeper::_doNominations} targets length was 0. Skipping nominations`
          );
          return;
        }

        await nominator.nominate(targets, dryRun || this.config.global.dryRun);

        // Wait some time between each transaction to avoid nonce issues.
        await sleep(16000);

        const targetsString = (
          await Promise.all(
            targets.map(async (target) => {
              const name = (await this.db.getCandidate(target)).name;
              return `- ${name} (${target})`;
            })
          )
        ).join("\n");

        const stash = await nominator.stash();
        if (!stash) continue;
        const name = (await this.db.getChainMetadata()).name;
        const decimals = name == "Kusama" ? 12 : 10;
        const [rawBal, err] = await this.chaindata.getBondedAmount(stash);
        const bal = toDecimals(rawBal, decimals);
        const sym = name == "Kusama" ? "KSM" : "DOT";

        const targetsHtml = (
          await Promise.all(
            targets.map(async (target) => {
              const name = (await this.db.getCandidate(target)).name;
              return `- ${name} (${addressUrl(target, this.config)})`;
            })
          )
        ).join("<br>");

        logger.info(
          `Nominator ${stash} (${bal} ${sym}) / ${nominator.controller} nominated:\n${targetsString}`
        );
        this.botLog(
          `Nominator ${addressUrl(stash, this.config)} (${bal} ${sym}) / 
          ${addressUrl(
            nominator.controller,
            this.config
          )} nominated:<br>${targetsHtml}`
        );
      }
    }
    logger.info(
      `(Scorekeeper::_doNominations) Number of Validators nominated this round: ${counter}`
    );
    this.botLog(`${counter} Validators nominated this round`);

    this.currentTargets = allTargets.slice(0, counter);
    const nextTargets = allTargets.slice(counter, allTargets.length);

    const nextTargetsString = (
      await Promise.all(
        nextTargets.map(async (target) => {
          const name = (await this.db.getCandidate(target)).name;
          return `- ${name} (${target})`;
        })
      )
    ).join("\n");
    logger.info(`Next targets: \n${nextTargetsString}`);

    return counter;
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
    // This includes both the candidates we have nominated as well as all valid candidates

    // Gets adds candidates we nominated to the list
    for (const nomGroup of this.nominatorGroups) {
      for (const nominator of nomGroup) {
        const current = await this.db.getCurrentTargets(nominator.controller);

        // If not nominating any... then return.
        if (!current.length) {
          logger.info(`${nominator.controller} is not nominating any targets.`);
          continue;
        }

        for (const stash of current) {
          const candidate = await this.db.getCandidate(stash);

          // if we already have, don't add it again
          if (toProcess.has(stash)) continue;
          toProcess.set(stash, candidate);
        }
      }
    }

    // Adds all other valid candidates to the list
    const allCandidates = await this.db.allCandidates();
    const identityHashTable = await this.constraints.populateIdentityHashTable(
      allCandidates
    );

    const validCandidates = await this.constraints.getValidCandidates(
      allCandidates,
      identityHashTable,
      this.db
    );

    for (const candidate of validCandidates) {
      if (toProcess.has(candidate.stash)) continue;
      toProcess.set(candidate.stash, candidate);
    }

    // Get the set of Good Validators and get the set of Bad validators
    const [good, bad] = await this.constraints.processCandidates(
      new Set(toProcess.values())
    );

    logger.info(
      `{ScoreKeeper::endRound} Done processing Candidates. ${good.size} good ${bad.size} bad`
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
      const didRank = await this.db.pushRankEvent(stash, startEra, activeEra);
      if (didRank) await this.addPoint(stash);
    }

    // For all bad validators, dock their points and create a "Fault Event"
    for (const badOne of bad.values()) {
      const { candidate, reason } = badOne;
      const { stash } = candidate;
      const didFault = await this.db.pushFaultEvent(stash, reason);
      if (didFault) await this.dockPoints(stash);
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
