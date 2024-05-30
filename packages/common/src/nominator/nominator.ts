import { SubmittableExtrinsic } from "@polkadot/api/types";
import Keyring from "@polkadot/keyring";

import { KeyringPair } from "@polkadot/keyring/types";
import { ChainData, Constants, queries, Types } from "../index";
import logger from "../logger";
import EventEmitter from "eventemitter3";
import { sendProxyDelayTx, sendProxyTx } from "./NominatorTx";
import { getNominatorChainInfo } from "./NominatorChainInfo";
import { NominatorState, NominatorStatus } from "../types";

export const nominatorLabel = { label: "Nominator" };

export default class Nominator extends EventEmitter {
  public currentlyNominating: Types.Stash[] = [];

  private _bondedAddress: string;
  private bot: any;
  public chaindata: ChainData;
  private signer: KeyringPair;

  // Set from config - if true nominations will be stubbed but not executed
  private _dryRun = false;

  // Use proxy of controller instead of controller directly.
  private _isProxy: boolean;

  // The amount of blocks for a time delay proxy
  private _proxyDelay: number;

  public lastEraNomination = 0;

  public _shouldNominate = false;

  private _status: NominatorStatus = {
    status: "Init",
    bondedAddress: "",
    stashAddress: "",
    bondedAmount: 0,
    isBonded: false,
    isProxy: false,
    proxyDelay: 0,
    proxyAddress: "",
    lastNominationEra: 0,
    currentTargets: [],
    proxyTxs: [],
    updated: Date.now(),
  };

  constructor(
    chaindata: ChainData,
    cfg: Types.NominatorConfig,
    networkPrefix = 2,
    bot?: any,
    dryRun = false,
  ) {
    super();
    this.chaindata = chaindata;
    this.bot = bot;
    this._isProxy = cfg.isProxy || false;
    this._dryRun = dryRun || false;

    // If the proxyDelay is not set in the config, default to TIME_DELAY_BLOCKS (~18 hours, 10800 blocks)
    this._proxyDelay =
      cfg.proxyDelay == 0 ? cfg.proxyDelay : Constants.TIME_DELAY_BLOCKS;

    const keyring = new Keyring({
      type: "sr25519",
    });

    keyring.setSS58Format(networkPrefix);

    this.signer = keyring.createFromUri(cfg.seed);
    this._bondedAddress = this._isProxy
      ? cfg.proxyFor ?? ""
      : this.signer.address;

    logger.info(
      `(Nominator::constructor) Nominator spawned: ${this.address} | ${
        this._isProxy ? "Proxy" : "Controller"
      } ${this._proxyDelay ? `| Delay: ${this._proxyDelay}` : ""} bonded address: ${this._bondedAddress}`,
      nominatorLabel,
    );
  }

  public getStatus = (): NominatorStatus => {
    return this._status;
  };

  public async updateNominatorStatus(newStatus?: NominatorStatus) {
    // Always update on-chain data for status
    const nominatorInfo = await getNominatorChainInfo(this);
    const {
      isBonded,
      bondedAmount,
      lastNominationEra,
      proxyAnnouncements,
      stale,
    } = nominatorInfo;

    this._status = {
      ...this._status,
      ...newStatus,
      isBonded,
      bondedAmount,
      lastNominationEra,
      proxyTxs: proxyAnnouncements,
      stale,
    };
  }

  public async shouldNominate(): Promise<boolean> {
    // refresh the nominator status with the latest on-chain data
    await this.updateNominatorStatus();

    const stash = await this.stash();
    const isBonded = await this.chaindata.isBonded(stash);
    const [bonded, err] = await this.chaindata.getDenomBondedAmount(stash);
    const proxyTxs = await queries.getAccountDelayedTx(this.bondedAddress);
    const lastNominationEra =
      (await this.chaindata.getNominatorLastNominationEra(stash)) || 0;
    this.lastEraNomination = lastNominationEra;

    const currentEra = (await this.chaindata.getCurrentEra()) || 0;
    this._shouldNominate =
      isBonded &&
      bonded > 50 &&
      currentEra - lastNominationEra >= 1 &&
      proxyTxs.length == 0;
    return this._shouldNominate;
  }

  public async init(): Promise<NominatorStatus | null> {
    try {
      const nominatorInfo = await getNominatorChainInfo(this);
      const {
        state,
        status: nominatorStatus,
        isBonded,
        bondedAmount,
        currentTargets,
        lastNominationEra,
        proxyAnnouncements,
        stale,
      } = nominatorInfo;
      const status: NominatorStatus = {
        state: state,
        status: nominatorStatus,
        bondedAddress: this.bondedAddress,
        stashAddress: await this.stash(),
        bondedAmount: bondedAmount,
        isBonded: isBonded,
        isProxy: this._isProxy,
        proxyDelay: this._proxyDelay,
        proxyAddress: this.signer.address,
        rewardDestination: await this.payee(),
        lastNominationEra: lastNominationEra,
        currentTargets: currentTargets,
        proxyTxs: proxyAnnouncements,
        stale: stale,
        dryRun: this._dryRun,
        updated: Date.now(),
        shouldNominate: this._shouldNominate,
      };
      await this.updateNominatorStatus(status);

      return status;
    } catch (e) {
      logger.error(`Error getting status for ${this.bondedAddress}: ${e}`);
      return null;
    }
  }

  public get status(): NominatorStatus {
    return this._status;
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
      // TODO: chain interaction should be performed exclusively in ChainData
      const api = await this.chaindata.handler.getApi();
      const ledger = await api.query.staking.ledger(this.bondedAddress);

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
        nominatorLabel,
      );
      logger.error(JSON.stringify(e), nominatorLabel);
      return this.bondedAddress;
    }
  }

  public async payee(): Promise<string> {
    try {
      const stash = await this.stash();
      const isBonded = await this.chaindata.isBonded(stash);
      if (!isBonded) {
        return "";
      }

      const rewardDestination =
        await this.chaindata.getRewardDestination(stash);
      if (rewardDestination) {
        return rewardDestination;
      } else {
        return "";
      }
    } catch (e) {
      logger.error(
        `Error getting payee for ${this.bondedAddress}: ${e}`,
        nominatorLabel,
      );
      logger.error(JSON.stringify(e), nominatorLabel);
      return "";
    }
  }

  public async signAndSendTx(
    tx: SubmittableExtrinsic<"promise">,
  ): Promise<boolean> {
    try {
      if (this._dryRun) {
        logger.info(`DRY RUN ENABLED, SKIPPING TX`, nominatorLabel);
        await this.updateNominatorStatus({
          state: NominatorState.Nominating,
          status: `[signAndSend] DRY RUN TX`,
          updated: Date.now(),
          stale: false,
        });
        return false;
      } else {
        logger.info(`Sending tx: ${tx.method.toString()}`, nominatorLabel);
        await tx.signAndSend(this.signer);
        await this.updateNominatorStatus({
          state: NominatorState.Nominated,
          status: `[signAndSend] signed and sent tx`,
          updated: Date.now(),
          stale: false,
        });
      }

      return true;
    } catch (e) {
      logger.error(`Error sending tx: `, nominatorLabel);
      logger.error(JSON.stringify(e), nominatorLabel);
      await this.updateNominatorStatus({
        status: `[signAndSend] Error signing and sending tx: ${JSON.stringify(e)}`,
        updated: Date.now(),
        stale: false,
      });
      return false;
    }
  }

  public async nominate(targets: Types.Stash[]): Promise<boolean> {
    try {
      const currentEra = (await this.chaindata.getCurrentEra()) || 0;
      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominating,
        status: `[nominate] start`,
        updated: Date.now(),
        stale: false,
      };

      await this.updateNominatorStatus(nominatorStatus);
      let isBonded;
      try {
        const stash = await this.stash();
        isBonded = await this.chaindata.isBonded(stash);
        if (!isBonded) return false;
      } catch (e) {
        logger.error(`Error checking if ${this.bondedAddress} is bonded: ${e}`);
        return false;
      }
      logger.info(`nominator is bonded: ${isBonded}`, nominatorLabel);

      await this.updateNominatorStatus({
        state: NominatorState.Nominating,
        status: `[nominate] bonded; ${isBonded}`,
        updated: Date.now(),
        stale: false,
      });
      let tx: SubmittableExtrinsic<"promise">;

      logger.info(
        `[nominate] proxy ${this._isProxy}; delay ${this._proxyDelay}`,
        nominatorLabel,
      );
      logger.info(
        `[nominate] is delay and greater than 0 ${this._isProxy && this._proxyDelay > 0}`,
        nominatorLabel,
      );
      // Start an announcement for a delayed proxy tx
      if (this._isProxy && this._proxyDelay > 0) {
        await this.updateNominatorStatus({
          state: NominatorState.Nominating,
          status: `[nominate] proxy ${this._isProxy}; delay ${this._proxyDelay}`,
          updated: Date.now(),
          stale: false,
        });
        logger.info(
          `Starting a delayed proxy tx for ${this.bondedAddress}`,
          nominatorLabel,
        );
        await sendProxyDelayTx(this, targets, this.chaindata);
      } else if (this._isProxy && this._proxyDelay == 0) {
        logger.info(
          `Starting a non delayed proxy tx for ${this.bondedAddress}`,
          nominatorLabel,
        );
        // Start a non delay proxy tx
        await sendProxyTx(this, targets, this.chaindata, this.bot);
      } else {
        logger.info(
          `Starting a non proxy tx for ${this.bondedAddress}`,
          nominatorLabel,
        );
        // Do a non-proxy tx
        // TODO: chain interaction should be performed exclusively in ChainData
        const api = await this.chaindata.handler.getApi();
        tx = api.tx.staking.nominate(targets);
        await this.sendStakingTx(tx, targets);
      }
      await queries.setLastNominatedEraIndex(currentEra);
      return true;
    } catch (e) {
      logger.error(`Error nominating: ${e}`, nominatorLabel);
      return false;
    }
  }

  public async cancelTx(announcement: {
    real: string;
    callHash: string;
    height: number;
  }): Promise<boolean> {
    // TODO: chain interaction should be performed exclusively in ChainData
    const api = await this.chaindata.handler.getApi();
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
    try {
      // If Dry Run is enabled in the config, nominations will be stubbed but not executed
      if (this._dryRun) {
        logger.info(`DRY RUN ENABLED, SKIPPING TX`, nominatorLabel);
        const currentEra = (await this.chaindata.getCurrentEra()) || 0;

        const namedTargets = await Promise.all(
          targets.map(async (target) => {
            const kyc = (await queries.isKYC(target)) || false;
            let name = (await queries.getIdentityName(target)) || "";

            // Fetch name using chaindata.getFormattedIdentity only if the name wasn't found initially
            if (!name) {
              const formattedIdentity =
                await this.chaindata.getFormattedIdentity(target);
              name = formattedIdentity?.name || "";
            }

            return {
              stash: target,
              name: name || "",
              kyc: kyc || false,
              score: 0,
            };
          }),
        );
        const nominatorStatus: NominatorStatus = {
          state: NominatorState.Nominating,
          status: `Dry Run: Nominated ${targets.length} validators`,
          updated: Date.now(),
          stale: false,
          currentTargets: namedTargets,
          lastNominationEra: currentEra,
        };
        await this.updateNominatorStatus(nominatorStatus);
        // `dryRun` return as blockhash is checked elsewhere to finish the hook of writing db entries
        return [false, "dryRun"];
      }
      const now = new Date().getTime();

      let didSend = true;
      let finalizedBlockHash: string | undefined;

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
            finalizedBlockHash = status.asFinalized.toString();
            didSend = true;
            logger.info(
              `{Nominator::nominate} tx is finalized in block ${finalizedBlockHash}`,
            );

            // TODO: chain interaction should be performed exclusively in ChainData
            const api = await this.chaindata.handler.getApi();
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
      const currentEra = (await this.chaindata.getCurrentEra()) || 0;
      const namedTargets = await Promise.all(
        targets.map(async (target) => {
          const kyc = await queries.isKYC(target);
          let name = await queries.getIdentityName(target);
          if (!name) {
            name =
              (await this.chaindata.getFormattedIdentity(target))?.name || "";
          }

          const score = await queries.getLatestValidatorScore(target);

          return {
            stash: target,
            name: name || "",
            kyc: kyc || false,
            score: score && score && score?.total ? score?.total : 0,
          };
        }),
      );
      const nominatorStatus: NominatorStatus = {
        state: NominatorState.Nominated,
        status: `Nominated ${targets.length} validators: ${didSend} ${finalizedBlockHash}`,
        updated: Date.now(),
        stale: false,
        currentTargets: namedTargets,
        lastNominationEra: currentEra,
      };
      await this.updateNominatorStatus(nominatorStatus);
      return [didSend, finalizedBlockHash || null]; // Change to return undefined
    } catch (e) {
      logger.error(`Error sending tx: ${JSON.stringify(e)}`, nominatorLabel);
      return [false, JSON.stringify(e)];
    }
  };
}
