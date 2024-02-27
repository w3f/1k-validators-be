import { SubmittableExtrinsic } from "@polkadot/api/types";
import Keyring from "@polkadot/keyring";
import { blake2AsHex } from "@polkadot/util-crypto";

import { KeyringPair } from "@polkadot/keyring/types";
import { DelayedTx } from "../db/models";
import ApiHandler from "../ApiHandler/ApiHandler";
import { ChainData, Constants, queries, Types } from "../index";
import logger from "../logger";

const label = { label: "Nominator" };

export default class Nominator {
  public currentlyNominating: Types.Stash[] = [];

  private _bondedAddress: string;
  private bot: any;
  private handler: ApiHandler;
  private chaindata: ChainData;
  private signer: KeyringPair;

  // Use proxy of controller instead of controller directly.
  private _isProxy: boolean;

  // The amount of blocks for a time delay proxy
  private _proxyDelay: number;

  constructor(
    handler: ApiHandler,
    cfg: Types.NominatorConfig,
    networkPrefix = 2,
    bot: any,
  ) {
    this.handler = handler;
    this.chaindata = new ChainData(handler);
    this.bot = bot;
    this._isProxy = cfg.isProxy || false;

    // If the proxyDelay is not set in the config, default to TIME_DELAY_BLOCKS (~18 hours, 10800 blocks)
    this._proxyDelay =
      cfg.proxyDelay == 0 ? cfg.proxyDelay : Constants.TIME_DELAY_BLOCKS;

    logger.info(
      `{nominator::proxyDelay} config proxy delay: ${cfg.proxyDelay}`,
      label,
    );
    logger.info(
      `{nominator::proxy} nominator proxy delay: ${this._proxyDelay}`,
      label,
    );

    const keyring = new Keyring({
      type: "sr25519",
    });

    keyring.setSS58Format(networkPrefix);

    this.signer = keyring.createFromUri(cfg.seed);
    this._bondedAddress = this._isProxy
      ? cfg.proxyFor ?? ""
      : this.signer.address;

    logger.info(
      `(Nominator::constructor) Nominator signer spawned: ${this.address} | ${
        this._isProxy ? "Proxy" : "Controller"
      }`,
      label,
    );
  }

  public get address(): string {
    if (this._isProxy) {
      return this.signer.address;
    }

    return this.bondedAddress;
  }

  public get bondedAddress(): string {
    return this._bondedAddress;
  }

  public get isProxy(): boolean {
    return this._isProxy;
  }

  public get proxyDelay(): number {
    return this._proxyDelay;
  }

  public async stash(): Promise<string> {
    try {
      const api = this.handler.getApi();
      const ledger = await api?.query.staking.ledger(this.bondedAddress);

      if (ledger !== undefined && !ledger.isSome) {
        logger.warn(`Account ${this.bondedAddress} is not bonded!`);
        return this.bondedAddress;
      }

      if (ledger !== undefined) {
        const { stash } = ledger.unwrap();
        return stash.toString();
      } else {
        logger.warn(`No ledger information found for ${this.bondedAddress}`);
        return this.bondedAddress;
      }
    } catch (e) {
      logger.error(
        `Error getting stash for ${this.bondedAddress}: ${e}`,
        label,
      );
      logger.error(JSON.stringify(e), label);
      return this.bondedAddress;
    }
  }

  public async payee(): Promise<string> {
    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in payee`, label);
      return this._bondedAddress;
    }
    try {
      const ledger = await api?.query.staking.ledger(this.bondedAddress);
      if (!ledger) return this._bondedAddress;
      const { stash } = ledger.unwrap();
      const payee = await api.query.staking.payee(stash);
      if (payee) {
        // @ts-ignore
        return payee.toJSON()?.account
          ? // @ts-ignore
            payee.toJSON()?.account
          : payee.toString();
      }
      return this._bondedAddress;
    } catch (e) {
      logger.error(
        `Error getting payee for ${this.bondedAddress}: ${e}`,
        label,
      );
      logger.error(JSON.stringify(e), label);
      return this._bondedAddress;
    }
  }

  public async nominate(targets: Types.Stash[]): Promise<boolean> {
    const now = new Date().getTime();

    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in nominate`, label);
      return false;
    }

    try {
      const controller = await api?.query.staking.bonded(this.bondedAddress);
      if (!controller || controller.isNone) {
        logger.warn(`Account ${this.bondedAddress} is not bonded!`);
        return false;
      }
    } catch (e) {
      logger.error(`Error checking if ${this.bondedAddress} is bonded: ${e}`);
      return false;
    }

    let tx: SubmittableExtrinsic<"promise">;

    // Start an announcement for a delayed proxy tx
    if (this._isProxy && this._proxyDelay > 0) {
      logger.info(
        `{Nominator::nominate::proxy} starting tx for ${this.address} with proxy delay ${this._proxyDelay} blocks`,
        label,
      );

      const innerTx = api?.tx.staking.nominate(targets);

      const currentBlock = await api?.rpc.chain.getBlock();
      if (!currentBlock) {
        logger.error(
          `{Nominator::nominate} there was an error getting the current block`,
          label,
        );
        return false;
      }
      const { number } = currentBlock.block.header;
      const callHash = innerTx.method.hash.toString();

      tx = api?.tx.proxy.announce(
        this.bondedAddress,
        blake2AsHex(innerTx.method.toU8a()),
      );

      const delayedTx: DelayedTx = {
        number: number.toNumber(),
        controller: this.bondedAddress,
        targets,
        callHash,
      };
      await queries.addDelayedTx(delayedTx);

      try {
        await tx.signAndSend(this.signer);
      } catch (e) {
        logger.error(
          `{Nominator::nominate} there was an error sending the tx`,
          label,
        );
        logger.error(e);
      }
    } else if (this._isProxy && this._proxyDelay == 0) {
      // Start a normal proxy tx call
      logger.info(
        `{Nominator::nominate::proxy} starting tx for ${this.address} with proxy delay ${this._proxyDelay} blocks`,
        label,
      );

      const innerTx = api?.tx.staking.nominate(targets);
      const callHash = innerTx.method.hash.toString();

      const outerTx = api.tx.proxy.proxy(
        this.bondedAddress,
        "Staking",
        innerTx,
      );

      const [didSend, finalizedBlockHash] = (await this.sendStakingTx(
        outerTx,
        targets,
      )) ?? [false, ""];

      try {
        const era = await this.chaindata.getCurrentEra();
        if (!era) {
          logger.error(
            `{Nominator::nominate} there was an error getting the current era`,
            label,
          );
          return false;
        }
        const [bonded, err] = await this.chaindata.getBondedAmount(
          this.bondedAddress,
        );
        const denom = await this.chaindata.getDenom();

        if (bonded && denom) {
          await queries.setNomination(
            this.bondedAddress,
            era,
            targets,
            bonded / denom || 0,
            finalizedBlockHash || "",
          );
        }
      } catch (e) {
        logger.error(
          `{Nominator::nominate} there was an error setting the nomination for non-proxy tx in the db`,
          label,
        );
        logger.error(e);
      }

      const nominateMsg = `{Nominator::nominate::proxy} non-delay ${this.address} sent tx: ${didSend} finalized in block #${finalizedBlockHash}`;
      logger.info(nominateMsg, label);
      if (this.bot) await this.bot?.sendMessage(nominateMsg);
    } else {
      // Do a non-proxy tx
      logger.info(
        `(Nominator::nominate) Creating extrinsic Staking::nominate from ${this.address} to targets ${targets} at ${now}`,
        label,
      );
      tx = api.tx.staking.nominate(targets);
      logger.info(
        "(Nominator::nominate} Sending extrinsic to network...",
        label,
      );
      await this.sendStakingTx(tx, targets);
    }

    return true;
  }

  public async cancelTx(announcement: {
    real: string;
    callHash: string;
    height: number;
  }): Promise<boolean> {
    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in cancelTx`, label);
      return false;
    }
    const tx = api.tx.proxy.removeAnnouncement(
      announcement.real,
      announcement.callHash,
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
            `(Nominator::cancel) Included in block ${finalizedBlockHash}`,
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
    targets: string[],
  ): Promise<Types.BooleanResult> => {
    const now = new Date().getTime();
    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in sendStakingTx`, label);
      return [false, "error getting api to send staking tx"]; // Change to return undefined
    }

    let didSend = true;
    let finalizedBlockHash: string | undefined; // Corrected type declaration

    logger.info(
      `{Nominator::nominate} sending staking tx for ${this.bondedAddress}`,
    );

    const unsub = await tx.signAndSend(this.signer, async (result: any) => {
      const { status, events } = result;

      // Handle tx lifecycle
      switch (true) {
        case status.isBroadcast:
          logger.info(
            `{Nominator::nominate} tx for ${this.bondedAddress} has been broadcasted`,
          );
          break;
        case status.isInBlock:
          logger.info(
            `{Nominator::nominate} tx for ${this.bondedAddress} in block`,
          );
          break;
        case status.isUsurped:
          logger.info(
            `{Nominator::nominate} tx for ${this.bondedAddress} has been usurped: ${status.asUsurped}`,
          );
          didSend = false;
          unsub();
          break;
        case status.isFinalized:
          finalizedBlockHash = status.asFinalized.toString(); // Convert to string
          didSend = true;
          logger.info(
            `{Nominator::nominate} tx is finalized in block ${finalizedBlockHash}`,
          );

          for (const event of events) {
            if (
              event.event &&
              api.events.system.ExtrinsicFailed.is(event.event)
            ) {
              const {
                data: [error, info],
              } = event.event;

              if (error.isModule) {
                const decoded = api.registry.findMetaError(error.asModule);
                const { docs, method, section } = decoded;

                const errorMsg = `{Nominator::nominate} tx error:  [${section}.${method}] ${docs.join(
                  " ",
                )}`;
                logger.info(errorMsg);
                if (this.bot) await this.bot?.sendMessage(errorMsg);
                didSend = false;
                unsub();
              } else {
                // Other, CannotLookup, BadOrigin, no extra info
                logger.info(
                  `{Nominator::nominate} has an error: ${error.toString()}`,
                );
                didSend = false;
                unsub();
              }
            }
          }

          // The tx was otherwise successful

          this.currentlyNominating = targets;

          // Get the current nominations of an address
          const currentTargets = await queries.getCurrentTargets(
            this.bondedAddress,
          );

          // if the current targets is populated, clear it
          if (!!currentTargets.length) {
            logger.info("(Nominator::nominate) Wiping old targets");
            await queries.clearCurrent(this.bondedAddress);
          }

          // Update the nomination record in the db
          const era = await this.chaindata.getCurrentEra();
          if (!era) {
            logger.error(
              `{Nominator::nominate} error getting era for ${this.bondedAddress}`,
            );
            return;
          }

          const decimals = await this.chaindata.getDenom();
          if (!decimals) {
            logger.error(
              `{Nominator::nominate} error getting decimals for ${this.bondedAddress}`,
            );
            return;
          }
          const bonded = await this.chaindata.getBondedAmount(
            this.bondedAddress,
          );

          if (!bonded) {
            logger.error(
              `{Nominator::nominate} error getting bonded for ${this.bondedAddress}`,
            );
            return;
          }

          // update both the list of nominator for the nominator account as well as the time period of the nomination
          for (const stash of targets) {
            await queries.setTarget(this.bondedAddress, stash, era);
            await queries.setLastNomination(this.bondedAddress, now);
          }

          unsub();
          break;
        default:
          logger.info(
            `{Nominator::nominate} tx from ${this.bondedAddress} has another status: ${status}`,
          );
          break;
      }
    });
    return [didSend, finalizedBlockHash || null]; // Change to return undefined
  };
}
