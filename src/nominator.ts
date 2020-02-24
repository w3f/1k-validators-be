import { ApiPromise } from "@polkadot/api";
import Keyring from '@polkadot/keyring';
import { KeyringPair } from "@polkadot/keyring/types";

import Database from './db';

type NominatorConfig = {
  seed: string,
  maxNominations: number,
};

type Stash = string;

export default class Nominator {
  public currentlyNominating: Stash[] = [];
  public maxNominations: number;

  private api: ApiPromise;
  private db: Database;
  private signer: KeyringPair;

  constructor(api: ApiPromise, db: Database, cfg: NominatorConfig) {
    this.api = api;
    this.db = db;
    this.maxNominations = cfg.maxNominations;

    const keyring = new Keyring({
      type: 'sr25519',
    });

    this.signer = keyring.createFromUri(cfg.seed);
    console.log(`Nominator spawned: ${this.address}`);
  }

  public get address() { return this.signer.address; }

  public async nominate(targets: Stash[]): Promise<void> {
    const now = new Date().getTime();

    const tx = this.api.tx.staking.nominate(targets);
    console.log(
      `Sending extrinsic Staking::nominate from ${this.address} to targets ${targets} at ${now}`,
    );

    // const accountData = await this.api.query.system.account(this.signer.address);
    // console.log(accountData);

    const unsub = await tx.signAndSend(this.signer, (result: any) => {
      const { status } = result;

      console.log(`Status now: ${status.type}`);
      if (status.isFinalized) {
        console.log(`Included in block ${status.asFinalized}`);
        this.currentlyNominating = targets;
        for (const stash of targets) {
          this.db.setNominatedAt(stash, now);
        }
        unsub();
      }
    });
  }
}
