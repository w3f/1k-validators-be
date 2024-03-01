import { SubmittableExtrinsic } from "@polkadot/api/types";
import Keyring from "@polkadot/keyring";

import { KeyringPair } from "@polkadot/keyring/types";
import ApiHandler from "../ApiHandler/ApiHandler";
import { ChainData, Constants, queries, Types } from "../index";
import logger from "../logger";
import EventEmitter from "eventemitter3";
import { sendProxyDelayTx, sendProxyTx } from "./NominatorTx";

export const nominatorLabel = { label: "Nominator" };

export interface NominatorStatus {
  status?: string;
  isBonded?: boolean;
  bondedAddress?: string;
  bondedAmount?: number;
  stashAddress?: string;
  proxyAddress?: string;
  isProxy?: boolean;
  proxyDelay?: number;
  isNominating?: boolean;
  lastNominationEra?: number;
  lastNominationTime?: number;
  currentTargets?:
    | string[]
    | {
        stash?: string;
        name?: string;
        kyc?: boolean;
        score?: string | number;
      }[];
  nextTargets?: string[];
  proxyTxs?: any[];
  updated: number;
  rewardDestination?: string;
  stale?: boolean;
  dryRun?: boolean;
}

export default class Nominator extends EventEmitter {
  public currentlyNominating: Types.Stash[] = [];

  private _bondedAddress: string;
  private bot: any;
  private handler: ApiHandler;
  public chaindata: ChainData;
  private signer: KeyringPair;

  // Set from config - if true nominations will be stubbed but not executed
  private _dryRun = false;

  // Use proxy of controller instead of controller directly.
  private _isProxy: boolean;

  // The amount of blocks for a time delay proxy
  private _proxyDelay: number;

  private _canNominate: { canNominate: boolean; reason: string } = {
    canNominate: false,
    reason: "",
  };

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
    handler: ApiHandler,
    cfg: Types.NominatorConfig,
    networkPrefix = 2,
    bot?: any,
    dryRun = false,
  ) {
    super();
    this.handler = handler;
    this.chaindata = new ChainData(handler);
    this.bot = bot;
    this._isProxy = cfg.isProxy || false;
    this._dryRun = dryRun || false;

    // If the proxyDelay is not set in the config, default to TIME_DELAY_BLOCKS (~18 hours, 10800 blocks)
    this._proxyDelay =
      cfg.proxyDelay == 0 ? cfg.proxyDelay : Constants.TIME_DELAY_BLOCKS;

    logger.info(
      `{nominator::proxyDelay} config proxy delay: ${cfg.proxyDelay}`,
      nominatorLabel,
    );
    logger.info(
      `{nominator::proxy} nominator proxy delay: ${this._proxyDelay}`,
      nominatorLabel,
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
      nominatorLabel,
    );
  }

  public getStatus = (): NominatorStatus => {
    return this._status;
  };

  public updateNominatorStatus = (newStatus: NominatorStatus) => {
    this._status = { ...this._status, ...newStatus };
  };

  public async init(): Promise<NominatorStatus> {
    try {
      const stash = await this.stash();
      const isBonded = await this.chaindata.isBonded(stash);
      const [bonded, err] = await this.chaindata.getDenomBondedAmount(stash);

      const lastNominationEra =
        (await this.chaindata.getNominatorLastNominationEra(stash)) || 0;
      const currentTargets =
        (await this.chaindata.getNominatorCurrentTargets(stash)) || [];
      const currentNamedTargets = await Promise.all(
        currentTargets.map(async (target) => {
          const kyc = await queries.isKYC(target);
          let name = await queries.getIdentityName(target);
          if (!name) {
            name = (await this.chaindata.getFormattedIdentity(target))?.name;
          }

          const score = await queries.getLatestValidatorScore(target);
          let totalScore = 0;

          if (score && score[0] && score[0].total) {
            totalScore = parseFloat(score[0].total);
          }

          const formattedScore = totalScore;

          return {
            stash: target,
            name: name,
            kyc: kyc,
            score: formattedScore,
          };
        }),
      );

      const proxyAnnouncements = await this.chaindata.getProxyAnnouncements(
        this.signer.address,
      );

      const rewardDestination = await this.payee();
      const currentEra = (await this.chaindata.getCurrentEra()) || 0;
      const stale = isBonded && currentEra - lastNominationEra > 8;
      const status: NominatorStatus = {
        status: "Init",
        bondedAddress: this.bondedAddress,
        stashAddress: await this.stash(),
        bondedAmount: Number(bonded),
        isBonded: isBonded,
        isProxy: this._isProxy,
        proxyDelay: this._proxyDelay,
        proxyAddress: this.signer.address,
        rewardDestination: rewardDestination,
        lastNominationEra: lastNominationEra,
        currentTargets: currentNamedTargets,
        proxyTxs: proxyAnnouncements,
        stale: stale,
        dryRun: this._dryRun,
        updated: Date.now(),
      };
      this.updateNominatorStatus(status);
      this._canNominate = {
        canNominate: isBonded,
        reason: isBonded ? "Bonded" : "Not bonded",
      };
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
        nominatorLabel,
      );
      logger.error(JSON.stringify(e), nominatorLabel);
      return this.bondedAddress;
    }
  }

  public async payee(): Promise<string> {
    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in payee`, nominatorLabel);
      return "";
    }
    try {
      const isBonded = await this.chaindata.isBonded(this.bondedAddress);
      if (!isBonded) {
        return "";
      }
      const stash = await this.stash();
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
        return false;
      } else {
        logger.info(`Sending tx: ${tx.method.toString()}`, nominatorLabel);
        await tx.signAndSend(this.signer);
      }

      return true;
    } catch (e) {
      logger.error(`Error sending tx: `, nominatorLabel);
      logger.error(JSON.stringify(e), nominatorLabel);
      return false;
    }
  }

  public async nominate(targets: Types.Stash[]): Promise<boolean> {
    const now = new Date().getTime();

    const api = this.handler.getApi();
    if (!api) {
      logger.error(`Error getting API in nominate`, nominatorLabel);
      return false;
    }

    try {
      const isBonded = await this.chaindata.isBonded(this.bondedAddress);
      if (!isBonded) return false;
    } catch (e) {
      logger.error(`Error checking if ${this.bondedAddress} is bonded: ${e}`);
      return false;
    }

    let tx: SubmittableExtrinsic<"promise">;

    // Start an announcement for a delayed proxy tx
    if (this._isProxy && this._proxyDelay > 0) {
      logger.info(
        `Starting a delayed proxy tx for ${this.bondedAddress}`,
        nominatorLabel,
      );
      await sendProxyDelayTx(this, targets, this.chaindata, api);
    } else if (this._isProxy && this._proxyDelay == 0) {
      logger.info(
        `Starting a non delayed proxy tx for ${this.bondedAddress}`,
        nominatorLabel,
      );
      // Start a non delay proxy tx
      await sendProxyTx(this, targets, this.chaindata, api, this.bot);
    } else {
      logger.info(
        `Starting a non proxy tx for ${this.bondedAddress}`,
        nominatorLabel,
      );
      // Do a non-proxy tx
      tx = api.tx.staking.nominate(targets);
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
      logger.error(`Error getting API in cancelTx`, nominatorLabel);
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
    try {
      // If Dry Run is enabled in the config, nominations will be stubbed but not executed
      if (this._dryRun) {
        logger.info(`DRY RUN ENABLED, SKIPPING TX`, nominatorLabel);
        const currentEra = await this.chaindata.getCurrentEra();

        const namedTargets = await Promise.all(
          targets.map(async (target) => {
            const kyc = await queries.isKYC(target);
            let name = await queries.getIdentityName(target);
            if (!name) {
              name = (await this.chaindata.getFormattedIdentity(target))?.name;
            }

            const score = await queries.getLatestValidatorScore(target);
            let totalScore = 0;

            if (score && score[0] && score[0].total) {
              totalScore = parseFloat(score[0].total);
            }

            const formattedScore = totalScore;

            return {
              stash: target,
              name: namedTargets,
              kyc: kyc,
              score: formattedScore,
            };
          }),
        );
        const nominatorStatus: NominatorStatus = {
          status: `Dry Run: Nominated ${targets.length} validators`,
          updated: Date.now(),
          stale: false,
          currentTargets: targets,
          lastNominationEra: currentEra,
        };
        this.updateNominatorStatus(nominatorStatus);
        // `dryRun` return as blockhash is checked elsewhere to finish the hook of writing db entries
        return [false, "dryRun"];
      }
      const now = new Date().getTime();
      const api = this.handler.getApi();
      if (!api) {
        logger.error(`Error getting API in sendStakingTx`, nominatorLabel);
        return [false, "error getting api to send staking tx"];
      }

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
      const currentEra = await this.chaindata.getCurrentEra();
      const namedTargets = await Promise.all(
        targets.map(async (target) => {
          const kyc = await queries.isKYC(target);
          let name = await queries.getIdentityName(target);
          if (!name) {
            name = (await this.chaindata.getFormattedIdentity(target))?.name;
          }

          const score = await queries.getLatestValidatorScore(target);
          let totalScore = 0;

          if (score && score[0] && score[0].total) {
            totalScore = parseFloat(score[0].total);
          }

          const formattedScore = totalScore;

          return {
            stash: target,
            name: name,
            kyc: kyc,
            score: formattedScore,
          };
        }),
      );
      const nominatorStatus: NominatorStatus = {
        status: `Nominated ${targets.length} validators: ${didSend} ${finalizedBlockHash}`,
        updated: Date.now(),
        stale: false,
        currentTargets: namedTargets,
        lastNominationEra: currentEra,
      };
      this.updateNominatorStatus(nominatorStatus);
      return [didSend, finalizedBlockHash || null]; // Change to return undefined
    } catch (e) {
      logger.error(`Error sending tx: ${JSON.stringify(e)}`, nominatorLabel);
      return [false, e];
    }
  };
}
