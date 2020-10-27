import { ApiPromise } from "@polkadot/api";
import { CronJob } from "cron";

import ChainData from "./chaindata";
import Db from "./db";
import Nominator from "./nominator";
import { OTV } from "./constraints";

import logger from "./logger";
import { CandidateData, Stash } from "./types";
import { getNow } from "./util";

type NominatorSeed = { seed: string };
type NominatorGroup = NominatorSeed[];

type SpawnedNominatorGroup = Nominator[];

export default class ScoreKeeper {
  public api: ApiPromise;
  public bot: any;
  public chaindata: ChainData;
  public config: any;
  public constraints: OTV;
  public currentEra = 0;
  public currentTargets: string[];
  public db: Db;
  // Keeps track of a starting era for a round.
  public startEra = 0;

  private nominatorGroups: Array<SpawnedNominatorGroup> = [];

  constructor(api: ApiPromise, db: Db, config: any, bot: any = false) {
    this.api = api;
    this.db = db;
    this.config = config;
    this.bot = bot;
    this.chaindata = new ChainData(this.api);
    this.constraints = new OTV(
      this.api,
      this.config.constraints.skipConnectionTime
    );
  }

  getAllNominatorGroups(): SpawnedNominatorGroup[] {
    return this.nominatorGroups;
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
  _spawn(seed: string, maxNominations = 1): Nominator {
    return new Nominator(this.api, this.db, { seed, maxNominations });
  }

  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    const group = [];
    const now = getNow();
    for (const nominator of nominatorGroup) {
      const nom = this._spawn(nominator.seed);
      await this.db.addNominator(nom.address, now);
      group.push(nom);
    }
    this.nominatorGroups.push(group);

    await this.botLog(
      `Nominator group added! Nominator addresses: ${group
        .map((n) => n.address)
        .join(" ")}`
    );

    return true;
  }

  async begin(frequency: string): Promise<void> {
    setInterval(async () => {
      const allCandidates = await this.db.allCandidates();
      await this.constraints.getInvalidCandidates(allCandidates);
      await this.constraints.getValidCandidates(allCandidates);
    }, 2 * 60 * 1000);

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      await this.startRound();
    }

    new CronJob(frequency, async () => {
      if (!this.nominatorGroups) {
        logger.info("No nominators spawned. Skipping round.");
        return;
      }

      if (!this.config.scorekeeper.nominating) {
        logger.info("Nominating is disabled in the settings. Skipping round.");
        return;
      }

      if (!this.currentTargets) {
        await this.startRound();
      } else {
        await this.endRound();
        await this.startRound();
      }
    }).start();
  }

  /// Handles the beginning of a new round.
  async startRound(): Promise<string[]> {
    const now = new Date().getTime();

    // The nominations sent now won't be active until the next era.
    this.currentEra = (await this._getCurrentEra()) + 1;

    logger.info(`New round starting at ${now} for next Era ${this.currentEra}`);
    this.botLog(
      `New round is starting! Era ${this.currentEra} will begin new nominations.`
    );

    const allCandidates = await this.db.allCandidates();
    const validCandidates = await this.constraints.getValidCandidates(
      allCandidates
    );

    return await this._doNominations(validCandidates, 16, this.nominatorGroups);
  }

  async _doNominations(
    candidates: CandidateData[],
    setSize: number,
    nominatorGroups: SpawnedNominatorGroup[] = [],
    dryRun = false
  ): Promise<string[]> {
    // A "subset" is a group of 16 validators since this is the max that can
    // be nominated by a single account.
    const subsets = [];
    for (let i = 0; i < candidates.length; i += setSize) {
      subsets.push(candidates.slice(i, i + setSize));
    }

    const totalTargets: string[] = [];
    let count = 0;
    for (const subset of subsets) {
      const targets = subset.map((candidate) => candidate.stash);
      totalTargets.push(...subset.map((candidate) => candidate.name));

      for (const nomGroup of nominatorGroups) {
        // eslint-disable-next-line security/detect-object-injection
        const curNominator = nomGroup[count];
        if (curNominator === undefined) {
          logger.info("More targets than nominators!");
          continue;
        }
        logger.info(
          `(SK::_doNominations) targets = ${JSON.stringify(targets)}`
        );

        const current = await this.db.getCurrentTargets(curNominator.address);
        if (!!current.length) {
          logger.info("Wiping the old targets before making new nominations.");
          await this.db.clearCurrent(curNominator.address);
        }

        await curNominator.nominate(
          targets,
          dryRun || this.config.global.dryRun
        );
        this.botLog(
          `Nominator ${curNominator.address} nominated ${targets.join(" ")}`
        );
      }
      count++;
    }

    this.currentTargets = totalTargets;
    this.botLog(
      `Next targets: \n${totalTargets
        .map((target) => `- ${target}`)
        .join("\n")}`
    );

    return totalTargets;
  }

  async _getCurrentEra(): Promise<number> {
    const [eraIndex, eraErr] = await this.chaindata.getActiveEraIndex();
    if (eraErr) {
      throw eraErr;
    }
    return eraIndex;
  }

  /// Handles the ending of a round.
  async endRound(): Promise<void> {
    logger.info("Ending round");

    /// The targets that have already been processed for this round.
    const toProcess: Map<Stash, CandidateData> = new Map();

    for (const nomGroup of this.nominatorGroups) {
      for (const nominator of nomGroup) {
        const current = await this.db.getCurrentTargets(nominator.address);
        logger.info(`CURRENT - ${current}`);

        // If not nominating any... then return.
        if (!current.length) {
          logger.info(`${nominator.address} is not nominating any targets.`);
          continue;
        }

        // Wipe targets.
        await this.db.clearCurrent(nominator.address);

        for (const stash of current) {
          const candidate = await this.db.getCandidate(stash);
          logger.info(`CANDIDATE TO PROCESS - ${candidate}`);

          // If already processed, then skip to next stash.
          if (toProcess.has(stash)) continue;
          // Setting this here is probably fine, although it's not truly processed
          // until the end of this block.
          toProcess.set(stash, candidate);
        }
      }
    }

    logger.info(`SENDING TO PROCESSING - ${toProcess.values()}`);
    const [good, bad] = await this.constraints.processCandidates(
      new Set(toProcess.values())
    );

    for (const goodOne of good.values()) {
      const { stash } = goodOne;
      await this.addPoint(stash);
    }

    for (const badOne of bad.values()) {
      const { stash } = badOne;
      await this.dockPoints(stash);
    }
  }

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash): Promise<boolean> {
    logger.info(`Stash ${stash} did BAD, docking points`);

    // TODO: Do something with this return value.
    await this.db.dockPoints(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(`${candidate.name} docked points. New rank: ${candidate.rank}`);

    return true;
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash): Promise<boolean> {
    logger.info(`Stash ${stash} did GOOD, adding points`);

    // TODO: Do something with this return value.
    await this.db.addPoint(stash);

    const candidate = await this.db.getCandidate(stash);
    this.botLog(
      `${candidate.name} did GOOD! Adding a point. New rank: ${candidate.rank}`
    );

    return true;
  }
}
