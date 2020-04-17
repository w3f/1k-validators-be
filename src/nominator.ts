import { ApiPromise } from "@polkadot/api";
import Keyring from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";

import Database from "./db";
import logger from "./logger";

import { NominatorConfig, Stash } from "./types";

export default class Nominator {
  public currentlyNominating: Stash[] = [];
  public maxNominations: number;

  private api: ApiPromise;
  private botLog: any;
  private db: Database;
  private signer: KeyringPair;

  constructor(
    api: ApiPromise,
    db: Database,
    cfg: NominatorConfig,
    botLog: any
  ) {
    this.api = api;
    this.db = db;
    this.maxNominations = cfg.maxNominations;
    this.botLog = botLog;

    const keyring = new Keyring({
      type: "sr25519",
    });

    this.signer = keyring.createFromUri(cfg.seed);
    logger.info(`(Nominator::constructor) Nominator spawned: ${this.address}`);
  }

  public get address() {
    return this.signer.address;
  }

  public async nominate(targets: Stash[], dryRun = false): Promise<boolean> {
    const now = new Date().getTime();

    const tx = this.api.tx.staking.nominate(targets);
    logger.info(
      `(Nominator::nominate) Sending extrinsic Staking::nominate from ${this.address} to targets ${targets} at ${now}`
    );

    if (dryRun) {
      logger.info(`DRY RUN - STUBBING TRANSACTIONS`);
      for (const stash of targets) {
        await this.db.setTarget(this.address, stash, now);
        await this.db.setNominatedAt(stash, now);
      }
    } else {
      const unsub = await tx.signAndSend(this.signer, async (result: any) => {
        const { status } = result;

        logger.info(`(Nominator::nominate) Status now: ${status.type}`);
        if (status.isFinalized) {
          logger.info(
            `(Nominator::nominate) Included in block ${status.asFinalized}`
          );
          this.currentlyNominating = targets;
          for (const stash of targets) {
            await this.db.setTarget(this.address, stash, now);
            await this.db.setNominatedAt(stash, now);
          }
          unsub();
        }
      });
    }

    return true;
  }
}
