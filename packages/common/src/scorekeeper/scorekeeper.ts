import {
  ApiHandler,
  ChainData,
  Config,
  Constraints,
  logger,
  Models,
  queries,
  Util,
} from "../index";

import Nominator from "../nominator/nominator";
import {
  registerAPIHandler,
  registerEventEmitterHandler,
} from "./RegisterHandler";
import { Job, JobRunnerMetadata, JobStatus } from "./jobs/JobsClass";
import { JobsRunnerFactory } from "./jobs/JobsRunnerFactory";
import { startRound } from "./Round";
import { NominatorStatus } from "../types";
import { setAllIdentities } from "../utils";
// import { monitorJob } from "./jobs";

export type NominatorGroup = Config.NominatorConfig[];

export type SpawnedNominatorGroup = Nominator[];

export const scorekeeperLabel = { label: "Scorekeeper" };

// Scorekeeper is the main orchestrator of initiating jobs and kickstarting the workflow of nominations
export default class ScoreKeeper {
  public bot: any;
  public chaindata: ChainData;
  public config: Config.ConfigSchema;
  public constraints: Constraints.OTV;
  public currentEra = 0;
  public currentTargets: { stash?: string; identity?: any }[] = [];

  private _dryRun = false;

  // Set when the process is ending
  private ending = false;
  // Set when in the process of nominating
  private nominating = false;

  private nominatorGroups: Nominator[];

  private _jobs: Job[] = [];

  public upSince: number = Date.now();

  public isStarted = false;

  constructor(chaindata: ChainData, config: Config.ConfigSchema, bot?: any) {
    this.chaindata = chaindata;
    this.config = config;
    this.bot = bot || null;
    this.constraints = new Constraints.OTV(chaindata, this.config);
    this.nominatorGroups = [];
    this._dryRun = this.config.scorekeeper.dryRun;
    this.upSince = Date.now();

    registerAPIHandler(this.chaindata, this.bot);
    registerEventEmitterHandler(this);
  }
  public getJobsStatusAsJson() {
    const statuses: Record<string, JobStatus> = {};
    for (const job of this._jobs) {
      statuses[job.getName()] = job.getStatus();
    }
    return statuses;
  }

  getAllNominatorBondedAddresses(): string[] {
    const bondedAddresses = [];
    const nomGroup = this.nominatorGroups;
    if (nomGroup) {
      for (const nom of nomGroup) {
        bondedAddresses.push(nom?.bondedAddress);
      }

      return bondedAddresses;
    } else {
      return [];
    }
  }

  getAllNominatorStatus(): NominatorStatus[] {
    const statuses = [];
    for (const nom of this.nominatorGroups) {
      statuses.push(nom.getStatus());
    }
    return statuses;
  }

  getAllNominatorStatusJson() {
    return JSON.stringify(this.getAllNominatorStatus());
  }

  /// Spawns a new nominator.
  async _spawn(
    cfg: Config.NominatorConfig,
    networkPrefix = 12850,
  ): Promise<Nominator> {
    const nominator = new Nominator(
      this.chaindata,
      cfg,
      networkPrefix,
      this.bot,
      this._dryRun,
    );
    await nominator.init();
    return nominator;
  }

  // Adds nominators from the config
  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    const group = [];
    const now = Util.getNow();
    for (const nomCfg of nominatorGroup) {
      // Create a new Nominator instance from the nominator in the config
      const nom = await this._spawn(nomCfg, this.config.global.networkPrefix);

      // try and get the ledger for the nominator - this means it is bonded. If not then don't add it.

      // TODO: chain interaction should be performed exclusively in ChainData
      const api = await this.chaindata.handler.getApi();
      const ledger = await api.query.staking.ledger(nom.bondedAddress);
      if (!ledger) {
        logger.warn(
          `Adding nominator group -  ${nom.bondedAddress} is not bonded, skipping...`,
          scorekeeperLabel,
        );
        continue;
      } else {
        const stash = await nom.stash();
        const payee = await nom.payee();
        const [bonded, err] = await this.chaindata?.getBondedAmount(stash);
        const proxy = nom.isProxy ? nom.address : "";
        const proxyDelay = nom.proxyDelay;

        const nominator: Models.Nominator = {
          address: nom.bondedAddress,
          stash: stash,
          proxy: proxy,
          bonded: Number(bonded),
          now: now,
          proxyDelay: proxyDelay,
          rewardDestination: payee,
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

        group.push(nom);
      }
    }

    this.nominatorGroups?.push(...group);

    const nominatorGroupString = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const proxy = (await n.isProxy) ? `/ ${n.address}` : "";
          return `- ${n.bondedAddress} / ${stash} ${proxy}`;
        }),
      )
    ).join("\n");
    const nominatorGroupStringHtml = (
      await Promise.all(
        group.map(async (n) => {
          const stash = await n.stash();
          const name = (await queries.getChainMetadata())?.name;
          const decimals = 12;
          const [rawBal, err] = await this.chaindata.getBondedAmount(stash);
          const bal = Util.toDecimals(rawBal, decimals);
          const sym = "TANLOG";

          const proxy = (await n.isProxy)
            ? `/ ${Util.addressUrl(n.address, this.config)}`
            : "";
          return `- ${Util.addressUrl(
            n.bondedAddress,
            this.config,
          )} / ${Util.addressUrl(stash, this.config)} (${bal} ${sym}) ${proxy}`;
        }),
      )
    ).join("<br>");
    logger.info(
      `Nominator group added! Nominator addresses (Bonded Address / Stash / Proxy):\n${nominatorGroupString}`,
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
          const current = nominations?.current?.map((val) => {
            return `- ${val.name}<br>`;
          });

          return `- ${Util.addressUrl(
            n.bondedAddress,
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

  // Begin the main workflow of the scorekeeper
  async begin(): Promise<boolean> {
    try {
      const isTest = process.env.NODE_ENV === "test";
      logger.info(
        `Starting Scorekeeper. Dry run: ${this._dryRun} test: ${isTest}`,
        scorekeeperLabel,
      );

      const currentEra = (await this.chaindata.getCurrentEra()) || 0;
      this.currentEra = currentEra;

      if (!isTest) {
        await setAllIdentities(this.chaindata, scorekeeperLabel);
      }

      const nominationPromises = this.nominatorGroups.map((nom) =>
        nom.shouldNominate(),
      );

      const nominationResults = await Promise.all(nominationPromises);

      const filteredNominators = this.nominatorGroups.filter(
        (_, index) => nominationResults[index],
      );
      // If force round is set in the configs
      if (
        !isTest &&
        (this.config.scorekeeper.forceRound || filteredNominators.length > 0)
      ) {
        logger.info(
          `Force Round: ${this.config.scorekeeper.forceRound} test: ${isTest} - ${filteredNominators.length} nominators old - starting round....`,
          scorekeeperLabel,
        );
        await startRound(
          this.nominating,
          this.bot,
          this.constraints,
          filteredNominators,
          this.chaindata,
          this.config,
          this.currentTargets,
        );
      }

      // Start all Cron Jobs
      const metadata: JobRunnerMetadata = {
        config: this.config,
        chaindata: this.chaindata,
        nominatorGroups: this.nominatorGroups || [],
        nominating: this.nominating,
        // currentEra: this.currentEra,
        bot: this.bot,
        constraints: this.constraints,
        currentTargets: this.currentTargets,
      };

      const jobRunner = await JobsRunnerFactory.makeJobs(metadata);

      this._jobs = await jobRunner.startJobs();
      this.isStarted = true;
      return true;
    } catch (e) {
      logger.error(JSON.stringify(e), scorekeeperLabel);
      return false;
    }
  }
}
