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
import { startRound } from "./Round";
import {
  registerAPIHandler,
  registerEventEmitterHandler,
} from "./RegisterHandler";
import { jobsMetadata, JobStatus } from "./jobs/JobsClass";
import { JobsFactory } from "./jobs/JobsFactory";
import { setAllIdentities } from "../utils";
import { JobErroredData, JobFinishedData, JobRunningData } from "../types";
// import { monitorJob } from "./jobs";

export type NominatorGroup = Config.NominatorConfig[];

export type SpawnedNominatorGroup = Nominator[];

export const scorekeeperLabel = { label: "Scorekeeper" };

// Scorekeeper is the main orchestrator of initiating jobs and kickstarting the workflow of nominations
export default class ScoreKeeper {
  public handler: ApiHandler;
  public bot: any;
  public chaindata: ChainData;
  public config: Config.ConfigSchema;
  public constraints: Constraints.OTV;
  public currentEra = 0;
  public currentTargets: { stash?: string; identity?: any }[] = [];

  private isUpdatingEras = false;
  // Set when the process is ending
  private ending = false;
  // Set when in the process of nominating
  private nominating = false;

  private nominatorGroups: Nominator[];
  public _jobsStatus: Record<string, JobStatus> = {};

  constructor(handler: ApiHandler, config: Config.ConfigSchema, bot: any) {
    this.handler = handler;
    this.chaindata = new ChainData(this.handler);
    this.config = config;
    this.bot = bot || null;
    this.constraints = new Constraints.OTV(this.handler, this.config);
    this._jobsStatus = {};
    this.nominatorGroups = [];

    registerAPIHandler(this.handler, this.config, this.chaindata, this.bot);
    registerEventEmitterHandler(this);
  }

  public updateJobProgress(data: JobStatus) {
    const { name, progress, updated, iteration } = data;
    if (this._jobsStatus[name]) {
      this._jobsStatus[name].progress = progress;
      this._jobsStatus[name].updated = updated;
      this._jobsStatus[name].iteration = iteration;
    } else {
      logger.warn(`Job with name ${name} not found.`, scorekeeperLabel);
    }
  }

  public updateJobStarted(data: {
    name: string;
    runCount: number;
    updated: number;
  }) {
    const { name, runCount, updated } = data;
    this._jobsStatus[name] = {
      name: name,
      runCount,
      updated,
      status: "started",
    };
  }

  public updateJobRunning(data: JobRunningData) {
    const { name, runCount, updated } = data;
    this._jobsStatus[name] = {
      name: name,
      runCount,
      updated,
      status: "running",
    };
  }

  public updateJobFinished(data: JobFinishedData) {
    const { name, runCount, updated } = data;
    this._jobsStatus[name] = {
      name: name,
      runCount,
      updated,
      status: "finished",
    };
  }

  public updateJobErrored(data: JobErroredData) {
    const { name, runCount, updated, error } = data;
    this._jobsStatus[name] = {
      name: name,
      runCount,
      updated,
      status: "errored",
      error,
    };
  }

  public getJobsStatus(): Record<string, any> {
    return this._jobsStatus;
  }

  public getJobsStatusAsJson(): string {
    return JSON.stringify(this._jobsStatus);
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

  /// Spawns a new nominator.
  _spawn(cfg: Config.NominatorConfig, networkPrefix = 2): Nominator {
    return new Nominator(this.handler, cfg, networkPrefix, this.bot);
  }

  // Adds nominators from the config
  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    const group = [];
    const now = Util.getNow();
    for (const nomCfg of nominatorGroup) {
      // Create a new Nominator instance from the nominator in the config
      const nom = this._spawn(nomCfg, this.config.global.networkPrefix);

      // try and get the ledger for the nominator - this means it is bonded. If not then don't add it.
      const api = this.handler.getApi();
      if (!api) {
        logger.error(
          `Error getting API in addNominatorGroup`,
          scorekeeperLabel,
        );
        return false;
      }
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

        // Create a new accounting record in case one doesn't exist.
        await queries.newAccountingRecord(stash, nom.bondedAddress);
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
          const decimals = name == "Kusama" ? 12 : 10;
          const [rawBal, err] = await this.chaindata.getBondedAmount(stash);
          const bal = Util.toDecimals(rawBal, decimals);
          const sym = name == "Kusama" ? "KSM" : "DOT";

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
  async begin(): Promise<void> {
    logger.info(`Starting Scorekeeper.`, scorekeeperLabel);

    await setAllIdentities(this.chaindata, scorekeeperLabel);

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

    // Start all Cron Jobs
    const metadata: jobsMetadata = {
      config: this.config,
      ending: this.ending,
      chaindata: this.chaindata,
      nominatorGroups: this.nominatorGroups || [],
      nominating: this.nominating,
      currentEra: this.currentEra,
      bot: this.bot,
      constraints: this.constraints,
      handler: this.handler,
      currentTargets: this.currentTargets,
    };

    const jobs = await JobsFactory.makeJobs(metadata);
    await jobs.startJobs();
  }
}
