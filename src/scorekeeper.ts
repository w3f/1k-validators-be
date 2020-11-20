import { CronJob } from "cron";

import ApiHandler from "./ApiHandler";
import ChainData from "./chaindata";
import { Config } from "./config";
import { OTV } from "./constraints";
import Db from "./db";
import logger from "./logger";
import Nominator from "./nominator";
import { CandidateData, Stash } from "./types";
import { getNow } from "./util";

type NominatorSeed = { seed: string };
type NominatorGroup = NominatorSeed[];

type SpawnedNominatorGroup = Nominator[];

export default class ScoreKeeper {
  public handler: ApiHandler;
  public bot: any;
  public chaindata: ChainData;
  public config: Config;
  public constraints: OTV;
  public currentEra = 0;
  public currentTargets: string[];
  public db: Db;
  // Keeps track of a starting era for a round.
  public startEra = 0;

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
      this.config.constraints.skipIdentity
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
  _spawn(seed: string, maxNominations = 1, networkPrefix = 2): Nominator {
    return new Nominator(
      this.handler,
      this.db,
      { seed, maxNominations },
      networkPrefix
    );
  }

  async addNominatorGroup(nominatorGroup: NominatorGroup): Promise<boolean> {
    const group = [];
    const now = getNow();
    for (const nominator of nominatorGroup) {
      const nom = this._spawn(
        nominator.seed,
        16,
        this.config.global.networkPrefix
      );
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

  async begin(frequency: string): Promise<void> {
    setInterval(async () => {
      const allCandidates = await this.db.allCandidates();

      await this.constraints.populateIdentityHashTable(allCandidates);

      // set invalidityReason for stashes
      const invalid = await this.constraints.getInvalidCandidates(
        allCandidates
      );
      for (const i of invalid) {
        const { stash, reason } = i;
        await this.db.setInvalidityReason(stash, reason);
      }

      // set invalidityReason as empty for valid candidates
      const valid = await this.constraints.getValidCandidates(allCandidates);
      for (const v of valid) {
        const { stash } = v;
        await this.db.setInvalidityReason(stash, "");
      }
    }, 5 * 60 * 1000);

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      await this.startRound();
    }

    setInterval(async () => {
      const [activeEra, err] = await this.chaindata.getActiveEraIndex();
      if (err) {
        logger.info(`CRITICAL: ${err}`);
        return;
      }

      const {
        lastNominatedEraIndex,
      } = await this.db.getLastNominatedEraIndex();

      const eraBuffer = 3; // for Kusama

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
    }, 5 * 60 * 1000);
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
    await this.constraints.populateIdentityHashTable(allCandidates);

    const validCandidates = await this.constraints.getValidCandidates(
      allCandidates
    );

    const targets = await this._doNominations(
      validCandidates,
      16,
      this.nominatorGroups
    );

    await this.db.setLastNominatedEraIndex(this.currentEra);

    return targets;
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

        const current = await this.db.getCurrentTargets(
          curNominator.controller
        );
        if (!!current.length) {
          logger.info("Wiping the old targets before making new nominations.");
          await this.db.clearCurrent(curNominator.controller);
        }

        await curNominator.nominate(
          targets,
          dryRun || this.config.global.dryRun
        );
        this.botLog(
          `Nominator ${curNominator.controller} nominated ${targets.join(" ")}`
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

  /**
   * Handles the ending of a Nomination round.
   */
  async endRound(): Promise<void> {
    logger.info("Ending round");

    // The targets that have already been processed for this round.
    const toProcess: Map<Stash, CandidateData> = new Map();

    const {
      lastNominatedEraIndex: startEra,
    } = await this.db.getLastNominatedEraIndex();
    const [activeEra] = await this.chaindata.getActiveEraIndex();
    const activeValidators = await this.chaindata.activeValidatorsInPeriod(
      Number(startEra),
      activeEra
    );

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

      await this.addPoint(stash);
    }

    for (const badOne of bad.values()) {
      const { candidate, reason } = badOne;
      const { stash } = candidate;
      await this.db.pushFaultEvent(stash, reason);
      await this.dockPoints(stash);
    }
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
