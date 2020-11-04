import Keyring from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";
import ApiHandler from "./ApiHandler";

import Database from "./db";
import logger from "./logger";

import { NominatorConfig, Stash } from "./types";

export default class Nominator {
  public currentlyNominating: Stash[] = [];
  public maxNominations: number;

  private handler: ApiHandler;
  private db: Database;
  private signer: KeyringPair;
  private controller: string;

  constructor(
    handler: ApiHandler,
    db: Database,
    cfg: NominatorConfig,
    networkPrefix = 2
  ) {
    this.handler = handler;
    this.db = db;
    this.maxNominations = cfg.maxNominations;

    const keyring = new Keyring({
      type: "sr25519",
    });

    keyring.setSS58Format(networkPrefix);

    this.signer = keyring.createFromUri(cfg.seed);
    this.controller = this.signer.address;
    logger.info(`(Nominator::constructor) Nominator spawned: ${this.address}`);
  }

  public get address(): string {
    return this.controller;
  }

  public async stash(): Promise<any> {
    const api = await this.handler.getApi();
    const ledger = await api.query.staking.ledger(this.controller);
    const { stash } = ledger.unwrap();

    return stash;
  }

  public async nominate(targets: Stash[], dryRun = false): Promise<boolean> {
    const now = new Date().getTime();

    if (dryRun) {
      logger.info(`DRY RUN - STUBBING TRANSACTIONS`);
      for (const stash of targets) {
        await this.db.setTarget(this.address, stash, now);
        await this.db.setLastNomination(this.address, now);
      }
    } else {
      const api = await this.handler.getApi();
      const tx = api.tx.staking.nominate(targets);
      logger.info(
        `(Nominator::nominate) Sending extrinsic Staking::nominate from ${this.address} to targets ${targets} at ${now}`
      );

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
            await this.db.setLastNomination(this.address, now);
          }
          unsub();
        }
      });
    }

    return true;
  }
}
