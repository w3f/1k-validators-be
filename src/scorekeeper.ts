import { ApiPromise } from "@polkadot/api";
import Keyring from '@polkadot/keyring';
import { KeyringPair } from "@polkadot/keyring/types";

type Nomconfig = {
  seed: string,
  maxNominations: number,
};
type Stash = string;

/// 10% in per billion type.
const TEN_PERCENT: number = 10000000;

/// 50 KSM with decimals.
const FIFTY_KSM: number = 50 * 10**12;

class Nominator {
  private api: ApiPromise;
  private signer: KeyringPair;

  constructor(api: ApiPromise, seed: string) {
    this.api = api;

    const keyring = new Keyring({
      type: 'sr25519',
    });

    this.signer = keyring.createFromUri(seed);
  }

  async nominate(targets: Array<Stash>) {
    const tx = this.api.tx.staking.nominate(targets);
    console.log(
      `Sending extrinsic Staking::nominate from ${this.address} to targets ${targets}`
    );
    const unsub = await tx.signAndSend(this.signer, (result: any) => {
      const { status } = result;

      console.log(`Status now: ${status.type}`);
      if (status.finalized) {
        console.log(`Included in block ${status.asFinalized}`);
        unsub();
      }
    });
  }

  get address() { return this.signer.address; }

}

export default class ScoreKeeper {
  public api: ApiPromise;
  public currentSet: Array<Stash> = [];
  public db: any;
  private nominators: Array<Nominator> = [];

  constructor(api: ApiPromise, db: any) {
    this.api = api;
    this.db = db;
  }

  /// Spawns a new nominator.
  async spawn(seed: string) {
    this.nominators.push(
      new Nominator(this.api, seed)
    );
  }

  async begin() {
    if (!this.nominators) {
      throw new Error('No nominators spawned! Cannot begin.');
    }

      
  }

  /// Handles the beginning of a new round.
  async startRound(set: Array<Stash>) {
    this.currentSet = set;
  }
  
  /// Handles the ending of a round.
  async endRound() {
    const lastNominatedSet = this.currentSet;
    delete this.currentSet;

    for (const stash of lastNominatedSet) {
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

      /// TODO check against slashes in this era.
      //then if everything is all right...
      await this.addPoint(stash);
    }
    /// And start a new round.
  }

  /// Handles the docking of points from bad behaving validators.
  async dockPoints(stash: Stash) {
    const oldData = await this.db.getValidator(stash);
    /// This logic adds one to misbehaviors and reduces rank by half. 
    const newData = Object.assign(oldData, {
      rank: Math.floor(oldData.rank / 2),
      misbehaviors: oldData.misbehaviors + 1,
    });
    return this.db.setValidator(stash, newData);
  }

  /// Handles the adding of points to successful validators.
  async addPoint(stash: Stash) {
    const oldData = await this.db.getValidator(stash);
    const newData = Object.assign(oldData, {
      rank: oldData.rank + 1,
    });
    return this.db.setValidator(stash, newData);
  }
}
