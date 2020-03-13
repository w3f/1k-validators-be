import { ApiPromise } from "@polkadot/api";
import { CronJob } from 'cron';

import ChainData from './chaindata';
import Config from '../config.json';
import Nominator from './nominator';
import {
  FIFTY_KSM,
  TEN_PERCENT,
  WEEK,
} from './constants';

import logger from './logger';
import {Stash} from './types';
import { getNow } from './util';

type NominatorGroup = any[];

export default class ScoreKeeper {
  public api: ApiPromise;
  public bot: any;
  public chaindata: ChainData;
  public config: any;
  public currentEra: number = 0;
  public currentSet: Array<Stash> = [];
  public db: any;
  // Keeps track of a starting era for a round.
  public startEra: number = 0;

  public nominatorGroups: Array<NominatorGroup> = [];

  constructor(api: ApiPromise, db: any, config: any, bot: any = false) {
    this.api = api;
    this.db = db;
    this.config = config;
    this.bot = bot;
    this.chaindata = new ChainData(this.api);
  }

  async botLog(msg: string) {
    if (this.bot) {
      await this.bot.sendMessage(msg);
    }
  }

  /// Spawns a new nominator.
  _spawn(seed: string, maxNominations: number = 1): Nominator {
    return new Nominator(this.api, this.db, { seed, maxNominations }, this.botLog.bind(this))
  }

  async addNominatorGroup(nominatorGroup: NominatorGroup) {
    let group = [];
    for (const nominator of nominatorGroup) {
      const nom = this._spawn(nominator.seed);
      await this.db.addNominator(nom.address);
      group.push(nom);
    }
    this.nominatorGroups.push(group);
  }

  async begin(frequency: string) {
    if (!this.nominatorGroups) {
      throw new Error('No nominators spawned! Cannot begin.');
    }

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      await this.startRound();
    }

    new CronJob(frequency, async () => {
      if (!this.config.scorekeeper.nominating) {
        logger.info('Not nominating - skipping this round');
        return;
      }

      if (!this.currentSet) {
        await this.startRound();
      } else {
        await this.endRound();
        await this.startRound();
      }
    }).start(); 
  }

  /// Handles the beginning of a new round.
  async startRound() {
    const now = new Date().getTime();

    // The nominations sent now won't be active until the next era. 
    this.currentEra = await this._getCurrentEra()+1;

    logger.info(`New round starting at ${now} for next Era ${this.currentEra}`);
    this.botLog(
      `New round is starting! Era ${this.currentEra} will begin new nominations.`
    );

    const set = await this._getSet();
    this.currentSet = set;

    await this._doNominations(set, 16, this.nominatorGroups);
  }

  async _doNominations(set: any[], setSize: number, nominatorGroups: NominatorGroup[] = []) {
    // A "subset" is a group of 16 validators since this is the max that can
    // be nominated by a single account.
    let subsets = [];
    for (let i = 0; i < set.length; i += setSize) {
      subsets.push(set.slice(i, i + setSize));
    }

    let count = 0;
    for (const nodes of subsets) {
      const targets = nodes.map((node: any) => node.stash);

      for (const nomGroup of nominatorGroups) {
        const curNominator = nomGroup[count];
        if (curNominator === undefined) {
          logger.info('More targets than nominators!');
          continue;
        }
        logger.info(`(SK::_doNominations) targets = ${JSON.stringify(targets)}`);
        await curNominator.nominate(targets);
      }
      count++;
    }
  }

  async _getSet(): Promise<any[]> {
    let nodes = await this.db.allNodes();
    const activeEraIndex = await this.chaindata.getActiveEraIndex();

    // Ensure they meet the requirements of:
    //  - Less than 10% commission.
    //  - More than 50 KSM.
    let tmpNodes = [];
    for (const node of nodes) {
      // Only take nodes that have a stash attached.
      if (node.stash === null) {
        this.botLog(`${node.name} doesn't have a stash address attached. Skipping.`);
        continue;
      }

      // Only take nodes that are online.
      if (node.offlineSince !== 0) {
        this.botLog(`${node.name} is offline! Skipping.`);
        continue;
      }

      // Only take nodes that have goodSince over one week.
      if (!this.config.global.test) {
        const now = new Date().getTime();
        if (now - Number(node.goodSince) < WEEK) {
          this.botLog(`${node.name} hasn't been monitored for the required minimum length of a week yet. Skipping.`);
          continue;
        }
      }

      // Ensure node have 98% uptime (3.35 hours for one week).
      const totalOffline = node.offlineAccumulated / WEEK;
      if (totalOffline > 0.02) {
        this.botLog(`${node.name} has been offline ${node.offlineAccumulated / 1000 /60} minutes this week, longer than the maximum allowed of 3 hours. Skipping!`);
        continue;
      }

      const [commission, err] = await this.chaindata.getCommission(activeEraIndex, node.stash);
      const [own, err2] = await this.chaindata.getOwnExposure(activeEraIndex, node.stash);

      if (err && !Config.global.test) {
        logger.info(err);
        continue;
      }
      
      if (err2 && !Config.global.test) {
        logger.info(err2);
        continue;
      }

      if ((commission! <= TEN_PERCENT && own! >= FIFTY_KSM) || Config.global.test) {
        const index = nodes.indexOf(node);
        tmpNodes.push(nodes[index]);
      }
    }
    nodes = tmpNodes;

    // Sort by earliest connected on top.
    nodes.sort((a: any, b: any) => {
      return a.connectedAt - b.connectedAt;
    });
    // Sort so that the most recent nominations are at the bottom.
    nodes.sort((a: any, b: any) => {
      return a.nominatedAt - b.nominatedAt;
    });

    return nodes;
  }

  async _getCurrentEra(): Promise<number> {
    return this.chaindata.getActiveEraIndex();
  }

  /// Handles the ending of a round.
  async endRound() {
    logger.info('Ending round');
    const now = getNow();
    const activeEraIndex = await this.chaindata.getActiveEraIndex();

    for (const nomGroup of this.nominatorGroups) {
      for (const nominator of nomGroup) {
        const current = await this.db.getCurrentTargets(nominator.address);

        // If not nominating any... then return.
        if (!current) return;

        // Wipe targets.
        await this.db.newTargets(nominator.address, [], now);

        for (const stash of current) {
          /// Ensure the commission wasn't raised.
          const [commission, err] = await this.chaindata.getCommission(activeEraIndex, stash);
          // If error, something went wrong, don't reward nor dock points.
          if (err && !Config.global.test) {
            logger.info(err);
            continue;
          }

          if (commission! > TEN_PERCENT && !Config.global.test) {
            await this.dockPoints(stash);
            continue;
          }

          /// Ensure the 50 KSM minimum was not removed.
          const [own, err2] = await this.chaindata.getOwnExposure(activeEraIndex, stash);

          if (err2 && !Config.global.test) {
            logger.info(err2);
            continue;
          }

          if (own! < FIFTY_KSM && !Config.global.test) {
            await this.dockPoints(stash);
            continue;
          }

          /// Ensure the validator is still online.
          const node = await this.db.getValidator(stash);
          if (Number(node.offlineSince) !== 0) {
            await this.dockPoints(stash);
            continue;
          }

          /// Check slashes in this era and the previous eras.
          if (!Config.global.test) {
            const [hasSlashes, err3] = await this.chaindata.hasUnappliedSlashes(this.startEra, activeEraIndex, stash);
            if (err3) {
              logger.info(err3);
              continue;
            }
            if (hasSlashes) {
              this.dockPoints(stash);
            } else {
              this.addPoint(stash);
            }
          } else {
            this.addPoint(stash);
          }
        }
      }
    }
  }

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash) {
    logger.info(`Stash ${stash} did BAD, docking points`);

    const oldData = await this.db.getValidator(stash);

    /// This logic adds one to misbehaviors and reduces rank by half. 
    const newData = Object.assign(oldData, {
      rank: Math.floor(oldData.rank / 2),
      misbehaviors: oldData.misbehaviors + 1,
      // Reset `goodSince` effectively making them take a timeout for a week.
      goodSince: new Date().getTime(),
    });

    this.botLog(
      `${newData.name} docked points. New rank: ${newData.rank}`
    );

    return this.db.setValidator(stash, newData);
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash) {
    logger.info(`Stash ${stash} did GOOD, adding points`);

    const oldData = await this.db.getValidator(stash);
    const newData = Object.assign(oldData, {
      rank: oldData.rank + 1,
    });

    this.botLog(
      `${newData.name} did GOOD! Adding a point. New rank: ${newData.rank}`
    );
    return this.db.setValidator(stash, newData);
  }
}
