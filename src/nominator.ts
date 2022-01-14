import { SubmittableExtrinsic } from "@polkadot/api/types";
import Keyring from "@polkadot/keyring";
import { blake2AsHex } from "@polkadot/util-crypto";

import { KeyringPair } from "@polkadot/keyring/types";
import ApiHandler from "./ApiHandler";

import Database from "./db";
import logger from "./logger";

import { BooleanResult, NominatorConfig, Stash } from "./types";
import { toDecimals } from "./util";
import { TIME_DELAY_BLOCKS } from "./constants";
import { BotClaimEventSchema } from "./db/models";

export default class Nominator {
  public currentlyNominating: Stash[] = [];
  public maxNominations: number | "auto";

  private _controller: string;
  private db: Database;
  private bot: any;
  private handler: ApiHandler;
  private signer: KeyringPair;

  // Use proxy of controller instead of controller directly.
  private _isProxy: boolean;

  // The amount of blocks for a time delay proxy
  private _proxyDelay: number;

  // The ideal average amount of stake the account can nominate per validator
  private _avgStake = 0;
  // The target amount of how much funds should be bonded so they can all be optimally used
  private _targetBond = 0;
  // The target number of validators to nominate
  private _nominationNum = 0;

  constructor(
    handler: ApiHandler,
    db: Database,
    cfg: NominatorConfig,
    networkPrefix = 2,
    bot: any
  ) {
    this.handler = handler;
    this.db = db;
    this.bot = bot;
    this.maxNominations = cfg.maxNominations || 16;
    this._isProxy = cfg.isProxy || false;

    // If the proxyDelay is not set in the config, default to TIME_DELAY_BLOCKS (~18 hours, 10800 blocks)
    this._proxyDelay = cfg.proxyDelay == 0 ? cfg.proxyDelay : TIME_DELAY_BLOCKS;

    logger.info(
      `{nominator::proxyDelay} config proxy delay: ${cfg.proxyDelay}`
    );
    logger.info(
      `{nominator::proxy} nominator proxy delay: ${this._proxyDelay}`
    );

    const keyring = new Keyring({
      type: "sr25519",
    });

    keyring.setSS58Format(networkPrefix);

    this.signer = keyring.createFromUri(cfg.seed);
    this._controller = this._isProxy ? cfg.proxyFor : this.signer.address;
    logger.info(
      `(Nominator::constructor) Nominator signer spawned: ${this.address} | ${
        this._isProxy ? "Proxy" : "Controller"
      }`
    );
  }

  public get address(): string {
    if (this._isProxy) {
      return this.signer.address;
    }

    return this.controller;
  }

  public get controller(): string {
    return this._controller;
  }

  public get isProxy(): boolean {
    return this._isProxy;
  }

  public get proxyDelay(): number {
    return this._proxyDelay;
  }

  public async stash(): Promise<any> {
    const api = await this.handler.getApi();
    const ledger = await api.query.staking.ledger(this.controller);
    if (!ledger.isSome) {
      logger.warn(`Account ${this.controller} is not a controller account!`);
      return "0x";
    }
    const { stash } = ledger.unwrap();

    return stash;
  }

  public async payee(): Promise<any> {
    const api = await this.handler.getApi();
    const ledger = await api.query.staking.ledger(this.controller);
    const { stash } = ledger.unwrap();
    const payee = await api.query.staking.payee(stash);
    if (payee) {
      // @ts-ignore
      return payee.toJSON().account ? payee.toJSON().account : payee.toString();
    }
  }

  public get nominationNum(): number {
    return this.nominationNum;
  }

  public get targetBond(): number {
    return this.targetBond;
  }

  public get avgStake(): number {
    return this.avgStake;
  }

  public setBonding(nominationNum, targetBond, avgStake): boolean {
    this._nominationNum = nominationNum;
    this._targetBond = targetBond;
    this._avgStake = avgStake;
    return true;
  }

  public async nominate(targets: Stash[], dryRun = false): Promise<boolean> {
    const now = new Date().getTime();

    if (dryRun) {
      logger.info(`DRY RUN - STUBBING TRANSACTIONS`);
      for (const stash of targets) {
        await this.db.setTarget(this.controller, stash, now);
        await this.db.setLastNomination(this.controller, now);
      }
    } else {
      const api = await this.handler.getApi();

      let tx: SubmittableExtrinsic<"promise">;

      // Start an announcement for a delayed proxy tx
      if (this._isProxy && this._proxyDelay > 0) {
        logger.info(
          `{Nominator::nominate::proxy} starting tx for ${this.address} with proxy delay ${this._proxyDelay} blocks`
        );

        const innerTx = api.tx.staking.nominate(targets);

        const currentBlock = await api.rpc.chain.getBlock();
        const { number } = currentBlock.block.header;
        const callHash = innerTx.method.hash.toString();

        tx = api.tx.proxy.announce(
          this.controller,
          blake2AsHex(innerTx.method.toU8a())
        );
        await this.db.addDelayedTx(
          number.toNumber(),
          this.controller,
          targets,
          callHash
        );

        await tx.signAndSend(this.signer);
      } else if (this._isProxy && this._proxyDelay == 0) {
        // Start a normal proxy tx call
        logger.info(
          `{Nominator::nominate::proxy} starting tx for ${this.address} with proxy delay ${this._proxyDelay} blocks`
        );

        const innerTx = api.tx.staking.nominate(targets);
        const callHash = innerTx.method.hash.toString();

        const outerTx = api.tx.proxy.proxy(this.controller, "Staking", innerTx);

        const [didSend, finalizedBlockHash] = await this.sendStakingTx(
          outerTx,
          targets
        );

        const nominateMsg = `{Nominator::nominate::proxy} non-delay ${this.address} sent tx: ${didSend} finalized in block #${finalizedBlockHash}`;
        logger.info(nominateMsg);
        this.bot.sendMessage(nominateMsg);
      } else {
        // Do a non-proxy tx
        logger.info(
          `(Nominator::nominate) Creating extrinsic Staking::nominate from ${this.address} to targets ${targets} at ${now}`
        );
        tx = api.tx.staking.nominate(targets);
        logger.info("(Nominator::nominate} Sending extrinsic to network...");
        await this.sendStakingTx(tx, targets);
      }
    }

    return true;
  }

  // Adjust bond amounts - inputs are planck denominated
  public async adjustBond(
    newBondedAmount: number,
    currentBondedAmount
  ): Promise<boolean> {
    const now = new Date().getTime();

    const api = await this.handler.getApi();
    const chainType = await api.rpc.system.chain();
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;

    let tx: SubmittableExtrinsic<"promise">;

    // Start an announcement for a delayed proxy tx
    if (this._isProxy && this._proxyDelay > 0) {
      // TODO:
    } else if (this._isProxy && this._proxyDelay == 0) {
      // Start a normal proxy tx call
      logger.info(
        `{Nominator::bond::proxy} starting bond tx for ${
          this.controller
        } with proxy delay ${this._proxyDelay} blocks. Current bond is ${
          currentBondedAmount / denom
        }, setting to ${newBondedAmount / denom}`
      );
      let innerTx;

      if (currentBondedAmount > newBondedAmount) {
        const unbondDiff = BigInt(currentBondedAmount - newBondedAmount);
        logger.info(
          `{Nominator::BondDiff} ${this.controller} with bond: ${
            currentBondedAmount / denom
          }  will unbond ${Number(unbondDiff) / denom}`
        );
        innerTx = api.tx.staking.unbond(unbondDiff);
      } else if (currentBondedAmount < newBondedAmount) {
        const bondExtraDiff = BigInt(newBondedAmount - currentBondedAmount);
        logger.info(
          `{Nominator::BondDiff} ${this.controller} with bond: ${
            currentBondedAmount / denom
          }  will bond ${Number(bondExtraDiff) / denom} extra`
        );
        innerTx = api.tx.staking.bondExtra(bondExtraDiff);
      } else {
        logger.warn(
          `{Nominator::bond} could not compare bonds - currentBondedAmount ${currentBondedAmount} newBondedAmount: ${
            newBondedAmount / denom
          }`
        );
        return false;
      }

      if (innerTx) {
        const outerTx = api.tx.proxy.proxy(this.controller, "Staking", innerTx);

        const [didSend, finalizedBlockHash] = await this.sendBondTx(
          outerTx,
          newBondedAmount
        );

        const bondMsg = `{Nominator::bond::proxy} non-delay ${
          this.controller
        } sent tx to set bond to ${
          newBondedAmount / denom
        } : ${didSend} finalized in block #${finalizedBlockHash}`;
        logger.info(bondMsg);
        this.bot.sendMessage(bondMsg);
      }
    }
    return true;
  }

  public async cancelTx(announcement: {
    real: string;
    callHash: string;
    height: number;
  }): Promise<boolean> {
    const api = await this.handler.getApi();
    const tx = api.tx.proxy.removeAnnouncement(
      announcement.real,
      announcement.callHash
    );

    try {
      const unsub = await tx.signAndSend(this.signer, async (result: any) => {
        // TODO: Check result of Tx - either 'ExtrinsicSuccess' or 'ExtrinsicFail'
        //  - If the extrinsic fails, this needs some error handling / logging added

        const { status } = result;

        logger.info(`(Nominator::cancel) Status now: ${status.type}`);
        if (status.isFinalized) {
          const finalizedBlockHash = status.asFinalized;
          logger.info(
            `(Nominator::cancel) Included in block ${finalizedBlockHash}`
          );

          unsub();
        }
      });
      return true;
    } catch (err) {
      logger.warn(`Nominate tx failed: ${err}`);
      return false;
    }
  }

  sendStakingTx = async (
    tx: SubmittableExtrinsic<"promise">,
    targets: string[]
  ): Promise<BooleanResult> => {
    const now = new Date().getTime();
    const api = await this.handler.getApi();

    let didSend = true;
    let finalizedBlockHash;

    logger.info(
      `{Nominator::nominate} sending staking tx for ${this.controller}`
    );

    const unsub = await tx.signAndSend(this.signer, async (result: any) => {
      const { status, events } = result;

      // Handle tx lifecycle
      switch (true) {
        case status.isBroadcast:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} has been broadcasted`
          );
          break;
        case status.isInBlock:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} in block`
          );
          break;
        case status.isUsurped:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} has been usurped: ${status.asUsurped}`
          );
          didSend = false;
          unsub();
          break;
        case status.isFinalized:
          finalizedBlockHash = status.asFinalized;
          didSend = true;
          logger.info(
            `{Nominator::nominate} tx is finalized in block ${finalizedBlockHash}`
          );

          // Check the events to see if there was any errors - if there are return
          events
            .filter(({ event }) => api.events.system.ExtrinsicFailed.is(event))
            .forEach(
              ({
                event: {
                  data: [error, info],
                },
              }) => {
                if (error.isModule) {
                  const decoded = api.registry.findMetaError(error.asModule);
                  const { docs, method, section } = decoded;

                  const errorMsg = `{Nominator::nominate} tx error:  [${section}.${method}] ${docs.join(
                    " "
                  )}`;
                  logger.info(errorMsg);
                  this.bot.sendMessage(errorMsg);
                  didSend = false;
                  unsub();
                } else {
                  // Other, CannotLookup, BadOrigin, no extra info
                  logger.info(
                    `{Nominator::nominate} has an error: ${error.toString()}`
                  );
                  didSend = false;
                  unsub();
                }
              }
            );

          // The tx was otherwise successful

          this.currentlyNominating = targets;

          // Get the current nominations of an address
          const currentTargets = await this.db.getCurrentTargets(
            this.controller
          );

          // if the current targets is populated, clear it
          if (!!currentTargets.length) {
            logger.info("(Nominator::nominate) Wiping old targets");
            await this.db.clearCurrent(this.controller);
          }

          // update both the list of nominator for the nominator account as well as the time period of the nomination
          for (const stash of targets) {
            await this.db.setTarget(this.controller, stash, now);
            await this.db.setLastNomination(this.controller, now);
          }

          // Update the nomination record in the db
          const era = (await api.query.staking.activeEra()).toJSON()["index"];
          const decimals = (await this.db.getChainMetadata()).decimals;
          const bonded = toDecimals(
            (await api.query.staking.ledger(this.controller)).toJSON()[
              "active"
            ],
            decimals
          );
          await this.db.setNomination(
            this.address,
            era,
            targets,
            bonded,
            finalizedBlockHash
          );
          unsub();
          break;
        default:
          logger.info(
            `{Nominator::nominate} tx from ${this.controller} has another status: ${status}`
          );
          break;
      }
    });
    return [didSend, finalizedBlockHash];
  };

  sendBondTx = async (
    tx: SubmittableExtrinsic<"promise">,
    newBondAmount: number
  ): Promise<BooleanResult> => {
    const now = new Date().getTime();
    const api = await this.handler.getApi();

    let didSend = true;
    let finalizedBlockHash;

    logger.info(
      `{Nominator::bond} sending bonding tx for ${this.controller} for ${newBondAmount}`
    );

    const unsub = await tx.signAndSend(this.signer, async (result: any) => {
      const { status, events } = result;

      // Handle tx lifecycle
      switch (true) {
        case status.isBroadcast:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} has been broadcasted`
          );
          break;
        case status.isInBlock:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} in block`
          );
          break;
        case status.isUsurped:
          logger.info(
            `{Nominator::nominate} tx for ${this.controller} has been usurped: ${status.asUsurped}`
          );
          didSend = false;
          unsub();
          break;
        case status.isFinalized:
          finalizedBlockHash = status.asFinalized;
          didSend = true;
          logger.info(
            `{Nominator::bond} tx is finalized in block ${finalizedBlockHash}`
          );

          // Check the events to see if there was any errors - if there are return
          events
            .filter(({ event }) => api.events.system.ExtrinsicFailed.is(event))
            .forEach(
              ({
                event: {
                  data: [error, info],
                },
              }) => {
                if (error.isModule) {
                  const decoded = api.registry.findMetaError(error.asModule);
                  const { docs, method, section } = decoded;

                  const errorMsg = `{Nominator::bond} tx error:  [${section}.${method}] ${docs.join(
                    " "
                  )}`;
                  logger.info(errorMsg);
                  this.bot.sendMessage(errorMsg);
                  didSend = false;
                  unsub();
                } else {
                  // Other, CannotLookup, BadOrigin, no extra info
                  logger.info(
                    `{Nominator::bond} has an error: ${error.toString()}`
                  );
                  didSend = false;
                  unsub();
                }
              }
            );
          unsub();
          break;
        default:
          logger.info(
            `{Nominator::bond} tx from ${this.controller} has another status: ${status}`
          );
          break;
      }
    });
    return [didSend, finalizedBlockHash];
  };
}
