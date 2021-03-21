import { ApiPromise } from "@polkadot/api";
import ApiHandler from "./ApiHandler";

import {
  KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS,
  POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS,
  TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS,
} from "./constants";
import Db from "./db";
import logger from "./logger";
import { BooleanResult, NumberResult, StringResult } from "./types";
import { hex2a, toDecimals } from "./util";

type JSON = any;

class ChainData {
  public handler: ApiHandler;

  constructor(handler: ApiHandler) {
    this.handler = handler;
  }

  getActiveEraIndex = async (): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const activeEra = await api.query.staking.activeEra();
    if (activeEra.isNone) {
      logger.info(`NO ACTIVE ERA: ${activeEra.toString()}`);
      return [
        null,
        `Acitve era not found, this chain is might be using an older staking pallet.`,
      ];
    }
    return [activeEra.unwrap().index.toNumber(), null];
  };

  getCommission = async (validator: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const prefs = await api.query.staking.validators(validator);
    return [prefs.commission.toNumber(), null];
  };

  destinationIsStaked = async (validatorStash: string): Promise<boolean> => {
    const api = await this.handler.getApi();
    const payee = await api.query.staking.payee(validatorStash);
    return payee.isStaked;
  };

  getCommissionInEra = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const prefs = await api.query.staking.erasValidatorPrefs(
      eraIndex,
      validator
    );
    if (prefs.isEmpty) {
      return [
        null,
        `Preferences is empty. Are you sure ${validator} was a validator in era ${eraIndex}?`,
      ];
    } else {
      return [prefs.commission.toNumber(), null];
    }
  };

  getBalanceOf = async (validator: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const account = await api.query.system.account(validator);
    return [account.data.free.toNumber(), null];
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const controller = await api.query.staking.bonded(stash);
    if (controller.isNone) {
      return [null, "Not bonded to any account."];
    }
    if (controller.toString() === stash) {
      return [
        null,
        `Bonded to itself, please follow recommendations and bond to a different controller. Stash: ${stash} | Controller ${controller.toString()}`,
      ];
    }

    const ledger: JSON = await api.query.staking.ledger(controller.toString());
    if (ledger.isNone) {
      return [null, `Ledger is empty.`];
    }

    return [ledger.toJSON().active, null];
  };

  getOwnExposure = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    const exposure = await api.query.staking.erasStakers(eraIndex, validator);
    if (exposure.isEmpty) {
      return [
        null,
        `Exposure is empty. Are you sure ${validator} is a validator?`,
      ];
    } else {
      return [exposure.own.toNumber(), null];
    }
  };

  hasUnappliedSlashes = async (
    startEraIndex: number,
    endEraIndex: number,
    validator: string
  ): Promise<BooleanResult> => {
    const api = await this.handler.getApi();
    const earliestUnapplied = await api.query.staking.earliestUnappliedSlash();
    if (earliestUnapplied.isNone) {
      return [null, "Earliest unapplied is none."];
    }
    const earliestEraIndex = await earliestUnapplied.unwrap().toNumber();
    if (startEraIndex < earliestEraIndex) {
      return [null, `Start era is too early to query unapplied slashes.`];
    }

    const slashes = [];
    let curIndex = startEraIndex;
    while (curIndex <= endEraIndex) {
      const unappliedSlashes = await api.query.staking.unappliedSlashes(
        curIndex
      );

      const unappliedSlashesJson: JSON = unappliedSlashes.toJSON();
      for (const unappliedSlash of unappliedSlashesJson) {
        if (validator === unappliedSlash.validator) {
          slashes.push(unappliedSlash);
        }
      }
      curIndex++;
    }

    if (slashes.length) {
      return [true, null];
    } else {
      return [false, null];
    }
  };

  /**
   * Finds the block hash for a particular era index. Used to determine the
   * active validators within an era in `getActiveValidators`.
   *
   * @param chainType: either 'Polkadot', 'Kusama', or 'Local Testnet'
   */
  findEraBlockHash = async (
    era: number,
    chainType: string
  ): Promise<StringResult> => {
    const eraBlockLength =
      chainType == "Kusama"
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == "Polkadot"
        ? POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS
        : TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS;

    const api = await this.handler.getApi();
    const [activeEraIndex, err] = await this.getActiveEraIndex();
    if (err) {
      return [null, err];
    }

    if (era > activeEraIndex) {
      return [null, "Era has not happened."];
    }

    const latestBlock = await api.rpc.chain.getBlock();
    if (era == activeEraIndex) {
      return [latestBlock.block.header.hash.toString(), null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.block.header.number.toNumber() - approxBlocksAgo;
    while (true) {
      const blockHash = await api.rpc.chain.getBlockHash(testBlockNumber);
      const testEra = await api.query.staking.activeEra.at(blockHash);
      if (testEra.isNone) {
        logger.info(`Test era is none`);
        return [null, "Test era is none"];
      }
      const testIndex = testEra.unwrap().index.toNumber();
      if (era == testIndex) {
        return [blockHash.toString(), null];
      }

      if (testIndex > era) {
        testBlockNumber = testBlockNumber - eraBlockLength / 3;
      }

      if (testIndex < era) {
        testBlockNumber = testBlockNumber + eraBlockLength;
      }
    }
  };

  activeValidatorsInPeriod = async (
    startEra: number,
    endEra: number,
    chainType: string
  ): Promise<[string[] | null, string | null]> => {
    const api = await this.handler.getApi();

    const allValidators: Set<string> = new Set();
    let testEra = startEra;
    while (testEra <= endEra) {
      const [blockHash, err] = await this.findEraBlockHash(testEra, chainType);
      if (err) {
        return [null, err];
      }

      const validators = await api.query.session.validators.at(blockHash);
      for (const v of validators.toHuman() as any) {
        if (!allValidators.has(v)) {
          allValidators.add(v);
        }
      }

      testEra++;
    }

    return [Array.from(allValidators), null];
  };

  /**
   * Checks if an account has an identity set.
   * @param account The account to check.
   * @returns [hasIdentity, verified]
   */
  hasIdentity = async (account: string): Promise<[boolean, boolean]> => {
    const api = await this.handler.getApi();

    let identity = await api.query.identity.identityOf(account);
    if (!identity.isSome) {
      // check if it's a sub
      const superOf = await api.query.identity.superOf(account);
      if (superOf.isSome) {
        identity = await api.query.identity.identityOf(superOf.unwrap()[0]);
      }
    }
    let verified = false;
    if (identity.isSome) {
      const { judgements } = identity.unwrap();
      for (const judgement of judgements) {
        const status = judgement[1];
        verified = status.isReasonable || status.isKnownGood;
        if (verified) break;
      }
    }

    return [identity.isSome, verified];
  };

  /**
   * Gets the identity root for an account.
   * @param account The account to check.
   * @returns The identity root string.
   */
  getIdentity = async (account: string): Promise<string | null> => {
    const api = await this.handler.getApi();

    const identitiy = await api.query.identity.identityOf(account);
    if (!identitiy.isSome) {
      const superOf = await api.query.identity.superOf(account);
      if (superOf.isSome) {
        const id = await api.query.identity.identityOf(superOf.unwrap()[0]);
        if (id.isNone) {
          return null;
        }
        return id.unwrap().info.toString();
      }
    }
    if (identitiy.isSome) {
      return identitiy.unwrap().info.toString();
    }

    return null;
  };

  getFormattedIdentity = async (addr) => {
    console.log(addr);
    const api = await this.handler.getApi();

    let identity, verified, sub;
    identity = await api.query.identity.identityOf(addr);
    if (!identity.isSome) {
      identity = await api.query.identity.superOf(addr);
      if (!identity.isSome) return { name: addr, verified: false, sub: null };

      const subRaw = identity.toJSON()[1].raw;
      if (subRaw && subRaw.substring(0, 2) === "0x") {
        sub = hex2a(subRaw.substring(2));
      } else {
        sub = subRaw;
      }
      const superAddress = identity.toJSON()[0];
      identity = await api.query.identity.identityOf(superAddress);
    }

    const raw = identity.toJSON().info.display.raw;
    const { judgements } = identity.unwrap();
    for (const judgement of judgements) {
      const status = judgement[1];
      verified = status.isReasonable || status.isKnownGood;
    }

    if (raw && raw.substring(0, 2) === "0x") {
      return { name: hex2a(raw.substring(2)), verified: verified, sub: sub };
    } else return { name: raw, verified: verified, sub: sub };
  };

  getStashFromController = async (
    controller: string
  ): Promise<string | null> => {
    const api = await this.handler.getApi();

    const ledger: JSON = await api.query.staking.ledger(controller);
    if (ledger.isNone) {
      return null;
    }

    return ledger.toJSON().stash;
  };

  getControllerFromStash = async (stash: string): Promise<string | null> => {
    const api = await this.handler.getApi();
    const controller = await api.query.staking.bonded(stash);
    return controller.toString();
  };

  /**
   * Gets Nominations for a nomiantor at a given era
   * @param nominatorStash
   * @param era
   * @param chaindata
   * @param chainType
   * @returns
   */
  getNominationAt = async (nominatorStash: string, era: number, db: Db) => {
    const api = await this.handler.getApi();
    const chainMetadata = await db.getChainMetadata();
    const chainType = chainMetadata.name;
    const decimals = chainMetadata.decimals;

    const [blockhash, error] = await this.findEraBlockHash(era, chainType);

    if (error) {
      logger.info(
        `{queryNomination} There was an error fetching the block hash for era ${era}`
      );
      return;
    }

    const nomination = (
      await api.query.staking.nominators.at(blockhash, nominatorStash)
    ).toJSON();
    if (!nomination) {
      logger.info(
        `{writeHistoricNominations} There was no nominations for stash ${nominatorStash} in era ${era}.`
      );
      return;
    }
    const submittedIn = nomination["submittedIn"];
    const targets = nomination["targets"];

    if (!submittedIn || !targets) {
      return;
    }

    const controller = await api.query.staking.bonded(nominatorStash);
    const bondedLedger = (
      await api.query.staking.ledger.at(blockhash, controller.toString())
    ).toJSON();
    if (!bondedLedger) {
      logger.info(`{getNominationAt} no bonded ledger`);
      return;
    }
    const bonded = toDecimals(bondedLedger["active"], decimals);

    return {
      submittedIn: submittedIn,
      targets: targets,
      bonded: bonded,
    };
  };

  /**
   * Gets unclaimed eras for a validator
   * To check this, we query the ledger for claimedEras, which are the eras the validator has claiemd rewards for.
   * We then check for the history depth eras if they have earned era points for an era (which would indicate they are active)
   * and check to see if that era is included in the claimedEras. If not, it is an unclaimed era, and pushed to an unclaimed era
   * set that is returned.
   * @param validatorStash
   * @returns
   */
  getUnclaimedEras = async (validatorStash: string, db: Db) => {
    const start = Date.now();
    const api = await this.handler.getApi();
    const controller = await this.getControllerFromStash(validatorStash);
    if (!controller) {
      logger.info(
        `{Chaindata::getUnclaimedEras} ${validatorStash} does not have a controller`
      );
      return;
    }

    const ledger: JSON = (await api.query.staking.ledger(controller)).toJSON();
    if (!ledger) {
      logger.info(
        `{Chaindata::getUnclaimedRewards} ${validatorStash} and controller ${controller} doesn't have a ledger`
      );
      return;
    }

    const [currentEra, err] = await this.getActiveEraIndex();
    const claimedEras = ledger ? ledger.claimedRewards : null;
    const unclaimedEras = [];

    const startingEra = currentEra - 83 >= 0 ? currentEra - 83 : 0;
    for (let i = startingEra; i < currentEra; i++) {
      if (claimedEras.includes(i)) continue;
      const dbPoints = await db.getEraPoints(i, validatorStash);
      if (!dbPoints) continue;
      const eraPoints = dbPoints.eraPoints;
      if (eraPoints > 0 && !claimedEras.includes(i)) unclaimedEras.push(i);
    }

    const end = Date.now();

    logger.info(
      `{Chaindata::getUnclaimedRewards} ${validatorStash} done. Tooks ${
        (end - start) / 1000
      } seconds`
    );

    return unclaimedEras;
  };

  getTotalEraPoints = async (era: number) => {
    const api = await this.handler.getApi();
    const erasRewardPoints = await api.query.staking.erasRewardPoints(era);
    const total = erasRewardPoints.total;
    const validators = erasRewardPoints.individual;
    const vals = [];
    for (const [address, points] of validators.entries()) {
      vals.push({
        era: era,
        address: address.toString(),
        points: Number(points),
      });
    }
    return {
      era: era,
      total: Number(total),
      validators: vals,
    };
  };

  /**
   * Gets list of validators that have `validate` intentions
   * @returns list of all validators
   */
  getValidators = async () => {
    const api = await this.handler.getApi();
    const keys = await api.query.staking.validators.keys();
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString()
    );

    return validators;
  };

  /**
   * Gets the current session
   * @returns session as number
   */
  getSession = async () => {
    const api = await this.handler.getApi();
    const session = await api.query.session.currentIndex();
    return Number(session.toString());
  };

  getBalance = async (address: string) => {
    const api = await this.handler.getApi();
    const balance = api.query.system.account(address);
    return (await balance).data.toJSON();
  };

  getProxyAnnouncements = async (address: string) => {
    const api = await this.handler.getApi();
    const announcements = await api.query.proxy.announcements(address);
    const json = announcements.toJSON()[0];
    return json.map((announcement) => {
      return {
        real: announcement.real,
        callHash: announcement.callHash,
        height: announcement.height,
      };
    });
  };

  getLatestBlock = async () => {
    const api = await this.handler.getApi();

    return (await api.rpc.chain.getBlock()).block.header.number.toNumber();
  };
}

export default ChainData;
