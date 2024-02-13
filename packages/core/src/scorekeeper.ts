import { CronJob } from "cron";
import {
  ApiHandler,
  ChainData,
  Config,
  Constants,
  Constraints,
  logger,
  queries,
  Types,
  Util,
} from "@1kv/common";

import Nominator from "./nominator";
import Claimer from "./claimer";
import Monitor from "./monitor";
import { startMicroserviceJobs } from "./scorekeeper/jobs/MicroserviceJobs";
import { startMonolithJobs } from "./scorekeeper/jobs/MonolithJobs";
import { startScorekeeperJobs } from "./scorekeeper/jobs/ScorekeeperJobs";
import { dockPoints } from "./scorekeeper/Rank";
import { endRound, startRound } from "./scorekeeper/Round";
// import { monitorJob } from "./jobs";

export type NominatorGroup = Config.NominatorConfig[];

export type SpawnedNominatorGroup = Nominator[];

export const scorekeeperLabel = { label: "Scorekeeper" };

// The number of nominations a nominator can get in the set.

// Scorekeeper is the main orchestrator of initiating jobs and kickstarting the workflow of nominations
export default class ScoreKeeper {
  public handler: ApiHandler;
  public bot: any;
  public chaindata: ChainData;
  public config: Config.ConfigSchema;
  public constraints: Constraints.OTV;
  public currentEra = 0;
  public currentTargets: string[];

  // caches all the possible reward destinations for all candidates
  private rewardDestinationCache: string[];
  // caches all candidates
  private candidateCache: any[];

  private isUpdatingEras = false;
  // Set when the process is ending
  private ending = false;
  // Set when in the process of nominating
  private nominating = false;

  private nominatorGroups: Array<SpawnedNominatorGroup> = [];
  private claimer: Claimer;
  private monitor: Monitor;

  constructor(
    handler: ApiHandler,
    config: Config.ConfigSchema,
    bot: any = false,
  ) {
    this.handler = handler;
    this.chaindata = new ChainData(this.handler);

    // For every staking reward event, create an accounting record of the amount rewarded
    // this.handler.on(
    //   "reward",
    //   async (data: { stash: string; amount: string }) => {
    //     const { stash, amount } = data;
    //
    //     // check if the address was a candidate, and if so, update their unclaimed eras
    //     if (
    //       this.rewardDestinationCache &&
    //       this.rewardDestinationCache.includes(stash)
    //     ) {
    //       logger.info(
    //         `{scorekeeper::reward} ${stash} claimed reward of ${amount}. Updating eras....`
    //       );
    //
    //       // const unclaimedEras = await this.chaindata.getUnclaimedEras(
    //       //   stash,
    //       //   db
    //       // );
    //       //
    //       // await db.setUnclaimedEras(stash, unclaimedEras);
    //       // await this.constraints.checkCandidateStash(stash);
    //       // await this.constraints.scoreAllCandidates();
    //     }
    //
    //     // check if it was a nominator address that earned the reward
    //     for (const nomGroup of this.nominatorGroups) {
    //       for (const nom of nomGroup) {
    //         const nomStash = await nom.stash();
    //         if (!nomStash) continue;
    //         if (nomStash == stash) {
    //           const activeEra = await this.chaindata.getActiveEraIndex();
    //           await queries.updateAccountingRecord(
    //             nom.controller,
    //             nomStash,
    //             activeEra.toString(),
    //             amount
    //           );
    //         }
    //       }
    //     }
    //   }
    // );

    // Handles offline event. Validators will be faulted for each session they are offline
    //     If they have already reaceived an offline fault for that session, it is skipped
    this.handler.on("someOffline", async (data: { offlineVals: string[] }) => {
      const { offlineVals } = data;
      const session = await this.chaindata.getSession();
      for (const val of offlineVals) {
        const candidate = await queries.getCandidate(val);
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

        logger.info(`Some offline: ${reason}`, scorekeeperLabel);
        await this.bot?.sendMessage(reason);

        await queries.pushFaultEvent(candidate.stash, reason);
        await dockPoints(candidate.stash, this.bot);
      }
    });

    this.handler.on("newSession", async (data: { sessionIndex: string }) => {
      const { sessionIndex } = data;
      logger.info(`New Session Event: ${sessionIndex}`, scorekeeperLabel);
      const candidates = await queries.allCandidates();
      await Constraints.checkAllValidateIntentions(
        this.config,
        this.chaindata,
        candidates,
      );
      // await sessionKeyJob(this.db, this.chaindata, this.candidateCache);
      // await inclusionJob(this.db, this.chaindata, this.candidateCache);
      // await validatorPrefJob(this.db, this.chaindata, this.candidateCache);
      // await unclaimedErasJob(this.db, this.chaindata, this.candidateCache);
    });

    this.config = config;
    this.bot = bot;
    this.constraints = new Constraints.OTV(this.handler, this.config);
    this.monitor = new Monitor(Constants.SIXTEEN_HOURS);

    // this.populateCandidates();
    // this.populateRewardDestinationCache();
  }

  // Populates the candidate  cache
  async populateCandidates(): Promise<void> {
    this.candidateCache = await queries.allCandidates();
  }

  async populateRewardDestinationCache(): Promise<void> {
    const allCandidates = await queries.allCandidates();
    const rewardAddresses = [];
    for (const candidate of allCandidates) {
      if (
        !!candidate.rewardDestination &&
        candidate.rewardDestination.length == 48
      ) {
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

  /// Spawns a new nominator.
  _spawn(cfg: Config.NominatorConfig, networkPrefix = 2): Nominator {
    return new Nominator(this.handler, cfg, networkPrefix, this.bot);
  }

  // Adds nominators from the config
  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    let group = [];
    const now = Util.getNow();
    for (const nomCfg of nominatorGroup) {
      // Create a new Nominator instance from the nominator in the config
      const nom = this._spawn(nomCfg, this.config.global.networkPrefix);

      // try and get the ledger for the nominator - this means it is bonded. If not then don't add it.
      const api = this.handler.getApi();
      const ledger = await api.query.staking.ledger(nom.controller);
      if (!ledger) {
        logger.warn(
          `Adding nominator group -  ${nom.controller} is not bonded, skipping...`,
          scorekeeperLabel,
        );
        continue;
      } else {
        const stash = await nom.stash();
        const payee = await nom.payee();
        const [bonded, err] = await this.chaindata.getBondedAmount(stash);
        const proxy = nom.isProxy ? nom.address : "";
        const proxyDelay = nom.proxyDelay;

        // const { nominationNum, newBondedAmount, targetValStake } =
        //   await autoNumNominations(api, nom);

        const nominator = {
          address: nom.controller,
          stash: stash,
          proxy: proxy,
          bonded: bonded,
          now: now,
          proxyDelay: proxyDelay,
          payee: payee,
        };
        try {
          await queries.addNominator(nominator);
        } catch (e) {
          logger.error(JSON.stringify(e), scorekeeperLabel);
          logger.error(
            `Scorekeeper add nominator: ${JSON.stringify(nominator)} failed`,
            scorekeeperLabel,
          );
        }

        // Create a new accounting record in case one doesn't exist.
        await queries.newAccountingRecord(stash, nom.controller);
        group.push(nom);
      }
    }
    // Sort the group by the lowest avg stake
    group = group.sort((a, b) => a.avgStake - b.avgStake);
    this.nominatorGroups.push(group);

    const nominatorGroupString = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const proxy = (await n._isProxy) ? `/ ${n.address}` : "";
          return `- ${n.controller} / ${stash} ${proxy}`;
        }),
      )
    ).join("\n");
    const nominatorGroupStringHtml = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const name = (await queries.getChainMetadata()).name;
          const decimals = name == "Kusama" ? 12 : 10;
          const [rawBal, err] = await this.chaindata.getBondedAmount(stash);
          const bal = Util.toDecimals(rawBal, decimals);
          const sym = name == "Kusama" ? "KSM" : "DOT";

          const proxy = (await n._isProxy)
            ? `/ ${Util.addressUrl(n.address, this.config)}`
            : "";
          return `- ${Util.addressUrl(
            n.controller,
            this.config,
          )} / ${Util.addressUrl(stash, this.config)} (${bal} ${sym}) ${proxy}`;
        }),
      )
    ).join("<br>");
    logger.info(
      `Nominator group added! Nominator addresses (Controller / Stash / Proxy):\n${nominatorGroupString}`,
      scorekeeperLabel,
    );

    await this.bot?.sendMessage(
      `<h4>Nominator group added! Nominator addresses (Controller / Stash / Proxy):</h4><br> ${nominatorGroupStringHtml}`,
    );

    const currentNominationsGroupStringHtml = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();

          const nominations = await queries.getNominator(stash);
          const current = nominations.current.map((val) => {
            return `- ${val.name}<br>`;
          });

          return `- ${Util.addressUrl(
            n.controller,
            this.config,
          )} / ${Util.addressUrl(
            stash,
            this.config,
          )} <br> Current Nominations:<br> ${current}`;
        }),
      )
    ).join("<br>");

    await this.bot?.sendMessage(currentNominationsGroupStringHtml);

    return true;
  }

  // Adds a claimer from the config
  async addClaimer(claimerCfg: Types.ClaimerConfig): Promise<boolean> {
    const claimer = new Claimer(
      this.handler,
      claimerCfg,
      this.config.global.networkPrefix,
      this.bot,
    );
    this.claimer = claimer;
    await this.bot?.sendMessage(
      `<h4>Added Reward Claimer:</h4><br> - ${this.claimer.address}`,
    );
    return true;
  }

  // Begin the main workflow of the scorekeeper
  async begin(): Promise<void> {
    logger.info(`Starting Scorekeeper.`, scorekeeperLabel);

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      logger.info(
        `Force Round: ${this.config.scorekeeper.forceRound} starting round....`,
        scorekeeperLabel,
      );
      await startRound(
        this.nominating,
        this.currentEra,
        this.bot,
        this.constraints,
        this.nominatorGroups,
        this.chaindata,
        this.handler,
        this.config,
        this.currentTargets,
      );
    }

    // Main cron job for starting rounds and ending rounds of the scorekeeper
    const scoreKeeperFrequency = this.config.cron?.scorekeeper
      ? this.config.cron?.scorekeeper
      : Constants.SCOREKEEPER_CRON;
    const mainCron = new CronJob(scoreKeeperFrequency, async () => {
      logger.info(
        `Running mainCron of Scorekeeper with frequency ${scoreKeeperFrequency}`,
        scorekeeperLabel,
      );

      if (this.ending) {
        logger.info(`ROUND IS CURRENTLY ENDING.`, scorekeeperLabel);
        return;
      }

      const [activeEra, err] = await this.chaindata.getActiveEraIndex();
      if (err) {
        logger.warn(`CRITICAL: ${err}`, scorekeeperLabel);
        return;
      }

      const { lastNominatedEraIndex } =
        await queries.getLastNominatedEraIndex();

      // For Kusama, Nominations will happen every 4 eras
      // For Polkadot, Nominations will happen every era
      const eraBuffer = this.config.global.networkPrefix == 0 ? 1 : 4;

      const isNominationRound =
        Number(lastNominatedEraIndex) <= activeEra - eraBuffer;

      if (isNominationRound) {
        logger.info(
          `Last nomination was in era ${lastNominatedEraIndex}. Current era is ${activeEra}. This is a nomination round.`,
          scorekeeperLabel,
        );
        if (!this.nominatorGroups) {
          logger.info(
            "No nominators spawned. Skipping round.",
            scorekeeperLabel,
          );
          return;
        }

        if (!this.config.scorekeeper.nominating) {
          logger.info(
            "Nominating is disabled in the settings. Skipping round.",
            scorekeeperLabel,
          );
          return;
        }

        // Get all the current targets to check if this should just be a starting round or if the round needs ending
        const allCurrentTargets = [];
        for (const nomGroup of this.nominatorGroups) {
          for (const nominator of nomGroup) {
            // Get the current nominations of an address
            const currentTargets = await queries.getCurrentTargets(
              nominator.controller,
            );
            allCurrentTargets.push(currentTargets);
          }
        }
        this.currentTargets = allCurrentTargets;

        if (!this.currentTargets) {
          logger.info(
            "Current Targets is empty. Starting round.",
            scorekeeperLabel,
          );
          await startRound(
            this.nominating,
            this.currentEra,
            this.bot,
            this.constraints,
            this.nominatorGroups,
            this.chaindata,
            this.handler,
            this.config,
            this.currentTargets,
          );
        } else {
          logger.info(`Ending round.`, scorekeeperLabel);
          await endRound(
            this.ending,
            this.nominatorGroups,
            this.chaindata,
            this.constraints,
            this.bot,
            this.config,
          );
          await startRound(
            this.nominating,
            this.currentEra,
            this.bot,
            this.constraints,
            this.nominatorGroups,
            this.chaindata,
            this.handler,
            this.config,
            this.currentTargets,
          );
        }
      }
    });

    // Start all Cron Jobs
    try {
      // Start Jobs in either microservice or monolith mode
      if (this.config?.redis?.host && this.config?.redis?.port) {
        await startMicroserviceJobs(this.config, this.chaindata);
      } else {
        await startMonolithJobs(this.config, this.chaindata, this.constraints);
      }

      // Start all scorekeeper / core jobs
      await startScorekeeperJobs(
        this.handler,
        this.nominatorGroups,
        this.config,
        this.bot,
        this.claimer,
        this.chaindata,
      );
    } catch (e) {
      logger.warn(
        `There was an error running some cron jobs...`,
        scorekeeperLabel,
      );
      logger.error(e);
    }
    logger.info(`going to start mainCron: `, scorekeeperLabel);
    await mainCron.start();
  }
}
