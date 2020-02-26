import { ApiPromise } from "@polkadot/api";
import { CronJob } from 'cron';

import Nominator from './nominator';
import {
  FIFTY_KSM,
  TEN_PERCENT,
  WEEK,
} from './constants';

type Stash = string;

export default class ScoreKeeper {
  public api: ApiPromise;
  public bot: any;
  public config: any;
  public currentEra: number = 0;
  public currentSet: Array<Stash> = [];
  public db: any;
  // Keeps track of a starting era for a round.
  public startEra: number = 0;

  public nominators: Array<Nominator> = [];

  constructor(api: ApiPromise, db: any, config: any, bot: any = false) {
    this.api = api;
    this.db = db;
    this.config = config;
    this.bot = bot;
  }

  async botLog(msg: string) {
    if (this.bot) {
      await this.bot.sendMessage(msg);
    }
  }

  /// Spawns a new nominator.
  async spawn(seed: string, maxNominations: number = 1) {
    const nominator = new Nominator(this.api, this.db, { seed, maxNominations })
    await this.db.addNominator(nominator.address);
    this.nominators.push(nominator);
  }

  async begin(frequency: string) {
    if (!this.nominators) {
      throw new Error('No nominators spawned! Cannot begin.');
    }

    // If `forceRound` is on - start immediately.
    if (this.config.scorekeeper.forceRound) {
      await this.startRound();
    }

    new CronJob(frequency, async () => {
      if (!this.config.scorekeeper.nominating) {
        console.log('Not nominating - skipping this round');
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

    console.log(`New round starting at ${now} for next Era ${this.currentEra}`);
    await this.botLog(
      `New round is starting! The next era ${this.currentEra} will begin new nominations.`
    );

    const set = await this._getSet();
    this.currentSet = set;

    for (const nominator of this.nominators) {
      const maxNominations = nominator.maxNominations;

      let toNominate = [];
      for (let i = 0; i < maxNominations; i++) {
        if (set.length > 0) {
          toNominate.push(
            set.shift(),
          );
        } else {
          console.log('ran to the end of candidates');
          return;
        }
      }

      toNominate = toNominate.map((node: any) => node.stash);

      await nominator.nominate(toNominate);
      this.db.newTargets(nominator.address, toNominate);
    }
  }

  async _getSet(): Promise<any[]> {
    let nodes = await this.db.allNodes();
    // Only take nodes that have a stash attached.
    nodes = nodes.filter((node: any) => node.stash !== null);
    // Only take nodes that are online.
    nodes = nodes.filter((node: any) => node.offlineSince === 0);
    // Only take nodes that have `goodSince` over one week.
    if (!this.config.global.test) {
      nodes = nodes.filter((node: any) => {
        const now = new Date().getTime();
        return now - Number(node.goodSince) >= WEEK;
      });
    }
    // Ensure nodes have 98% uptime (3.35 hours for one week).
    nodes = nodes.filter((node: any) => node.offlineAccumulated / WEEK <= 0.02);
    // Ensure they meet the requirements of:
    //  - Less than 10% commission.
    //  - More than 50 KSM.
    let tmpNodes = [];
    for (const node of nodes) {
      const preferences = await this.api.query.staking.validators(node.stash);
      //@ts-ignore
      const { commission } = preferences.toJSON()[0];
      const exposure = await this.api.query.staking.stakers(node.stash);
      //@ts-ignore
      const { own } = exposure.toJSON();
      if (Number(commission) <= TEN_PERCENT && own >= FIFTY_KSM) {
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

    // console.log('nodes', nodes);
    return nodes;
  }

  async _getCurrentEra(): Promise<number> {
    return (await this.api.query.staking.currentEra()).toNumber();
  }

  /// Handles the ending of a round.
  async endRound() {
    console.log('Ending round');

    for (const nominator of this.nominators) {
      const current = await this.db.getCurrentTargets(nominator.address);
      // Wipe targets.
      await this.db.newTargets(nominator.address, []);

      // If not nominating any... then return.
      if (!current) return;

      for (const stash of current) {
        /// Ensure the commission wasn't raised.
        const preferences = await this.api.query.staking.validators(stash);
        //@ts-ignore
        const { commission } = preferences.toJSON()[0];
        if (commission > TEN_PERCENT) {
          await this.dockPoints(stash);
          continue;
        }
        /// Ensure the 50 KSM minimum was not removed.
        const exposure = await this.api.query.staking.stakers(stash);
        //@ts-ignore
        const { own } = exposure.toJSON();
        if (own < FIFTY_KSM) {
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
        // TODO: Test this:
        const currentEra: number = await this._getCurrentEra();
        const startEra = this.startEra;
        const unsub = await this.api.query.staking.currentEra(async (era: any) => {
          era = era.toNumber();
          // When this era ends then check for slashes.
          if (era == currentEra+1) {
            while (era != startEra) {
              const slashes = await this.api.query.staking.validatorSlashInEra(era, stash);
              // console.log(slashes);
              if (!slashes.isNone) {
                this.dockPoints(stash);
                unsub();
                return;
              }
              era--;
            }
            // Should only reach here if no slashes were found.
            this.addPoint(stash);
            unsub();
          }
        });
      }
    }
  }

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash) {
    console.log(`Stash ${stash} did BAD, docking points`);

    const oldData = await this.db.getValidator(stash);
    /// This logic adds one to misbehaviors and reduces rank by half. 
    const newData = Object.assign(oldData, {
      rank: Math.floor(oldData.rank / 2),
      misbehaviors: oldData.misbehaviors + 1,
      // Reset `goodSince` effectively making them take a timeout for a week.
      goodSince: new Date().getTime(),
    });
    return this.db.setValidator(stash, newData);
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash) {
    console.log(`Stash ${stash} did GOOD, adding points`);

    const oldData = await this.db.getValidator(stash);
    const newData = Object.assign(oldData, {
      rank: oldData.rank + 1,
    });
    return this.db.setValidator(stash, newData);
  }
}
