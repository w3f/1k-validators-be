import { ApiPromise } from "@polkadot/api";
import "@polkadot/api-augment";
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

  // Returns the denomination of the chain. Used for formatting planck denomianted amounts
  getDenom = async (): Promise<number> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const chainType = await api.rpc.system.chain();
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;
    return denom;
  };

  // Gets the active era index
  getActiveEraIndex = async (): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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

  // Gets the curent era
  getCurrentEra = async () => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const currentEra = await api.query.staking.currentEra();
    return Number(currentEra);
  };

  // Gets the commision for a given validator
  getCommission = async (validator: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const prefs = await api.query.staking.validators(validator);
    return [prefs.commission.toNumber(), null];
  };

  // Gets the validator preferences, and whether or not they block external nominations
  getBlocked = async (validator: string): Promise<any> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const prefs = (
      await api.query.staking.validators(validator)
    )?.blocked.toString();
    return prefs == "true";
  };

  destinationIsStaked = async (validatorStash: string): Promise<boolean> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const payee = await api.query.staking.payee(validatorStash);
    return payee.isStaked;
  };

  getCommissionInEra = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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

  // returns the human denominated balance of a given address.
  getBalanceOf = async (address: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    // Get the denomination for this chain
    const denom = await this.getDenom();
    const account = await api.query.system.account(address);
    // Get the human formatted balance
    const balance = parseFloat(account.data.free.toString()) / denom;
    return [balance, null];
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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

  currentValidators = async (): Promise<any> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const validators = await api.query.session.validators();
    return validators.toJSON();
  };

  /**
   * Checks if an account has an identity set.
   * @param account The account to check.
   * @returns [hasIdentity, verified]
   */
  hasIdentity = async (account: string): Promise<[boolean, boolean]> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
      if (status.isReasonable || status.isKnownGood) {
        verified = status.isReasonable || status.isKnownGood;
        continue;
      }
    }

    if (raw && raw.substring(0, 2) === "0x") {
      return { name: hex2a(raw.substring(2)), verified: verified, sub: sub };
    } else return { name: raw, verified: verified, sub: sub };
  };

  getStashFromController = async (
    controller: string
  ): Promise<string | null> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const ledger: JSON = await api.query.staking.ledger(controller);
    if (ledger.isNone) {
      return null;
    }

    return ledger.toJSON().stash;
  };

  getControllerFromStash = async (stash: string): Promise<string | null> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const controller = await api.query.staking.bonded(stash);
    return controller.toString();
  };

  getRewardDestination = async (stash: string): Promise<string | null> => {
    const api = await this.handler.getApi();
    const rewardDestination: JSON = await api.query.staking.payee(stash);
    if (rewardDestination.toJSON().account) {
      return rewardDestination.toJSON().account;
    } else {
      return rewardDestination.toString();
    }
  };

  getQueuedKeys = async (): Promise<any> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const queuedKeys = await api.query.session.queuedKeys();
    const keys = queuedKeys.map(([validator, keys]) => {
      return {
        address: validator.toString(),
        keys: keys.toHex(),
      };
    });
    return keys;
  };

  getNextKeys = async (stash: string): Promise<string> => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const nextKeys = await api.query.session.nextKeys(stash);
    return nextKeys.toHex();
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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const erasRewardPoints = await api.query.staking.erasRewardPoints(era);
    const total = erasRewardPoints.total;
    const validators = erasRewardPoints.individual;
    const vals = [];
    for (const [address, points] of validators.entries()) {
      vals.push({
        era: era,
        address: address.toString(),
        eraPoints: Number(points),
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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const session = await api.query.session.currentIndex();
    return Number(session.toString());
  };

  getBalance = async (address: string) => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const balance = api.query.system.account(address);
    return (await balance).data.toJSON();
  };

  getProxyAnnouncements = async (address: string) => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

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
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    return (await api.rpc.chain.getBlock()).block.header.number.toNumber();
  };

  getLatestBlockHash = async () => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const latestBlock = await api.rpc.chain.getBlock();
    return latestBlock.block.header.hash.toString();
  };

  // gets the votes and stake amount of voting for council elections
  getCouncilVoting = async () => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const voteQuery = await api.derive.council.votes();
    const denom = await this.getDenom();

    const votes = voteQuery.map((voters) => {
      const who = voters[0];
      const { stake, votes } = voters[1];
      const formattedStake = parseFloat(stake.toString()) / denom;
      return {
        who: who,
        stake: formattedStake,
        votes: votes,
      };
    });
    return votes;
  };

  // gets info on the current council members as well as runner up candidates
  getElectionsInfo = async () => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const electionsQuery = await api.derive.elections.info();
    const {
      candidacyBond,
      desiredRunnersUp,
      desiredSeats,
      termDuration,
      candidateCount,
      candidates,
      members,
      runnersUp,
    } = electionsQuery;

    const denom = await this.getDenom();

    // Active council members and their total backings
    const membersMap = members.map((member) => {
      const address = member[0];
      const totalBacking = member[1];

      const formattedTotalBacking = parseFloat(totalBacking.toString()) / denom;

      return {
        address: address,
        totalBacking: formattedTotalBacking,
      };
    });

    // Candidates that are not active and their total backings
    const runnersUpMap = runnersUp.map((candidate) => {
      const address = candidate[0];
      const totalBacking = candidate[1];

      const formattedTotalBacking = parseFloat(totalBacking.toString()) / denom;

      return {
        address: address,
        totalBacking: formattedTotalBacking,
      };
    });

    // Candidates that have just put in their bid, and their total backings
    const candidatesMap = candidates.map((candidate) => {
      const address = candidate[0];
      const totalBacking = candidate[1];

      const formattedTotalBacking = parseFloat(totalBacking.toString()) / denom;

      return {
        address: address,
        totalBacking: formattedTotalBacking,
      };
    });

    return {
      candidacyBond: parseFloat(candidacyBond.toString()) / denom,
      desiredSeats: desiredSeats,
      termDuration: termDuration,
      members: membersMap,
      runnersUp: runnersUpMap,
      candidates: candidatesMap,
    };
  };

  // Returns the response from the derive referenda query
  getDerivedReferenda = async () => {
    const api = await this.handler.getApi();
    if (!api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    // A list of referenda that are currently active. They are in the form:
    //   {
    //   The image that was proposed
    //   image: {
    //       // The block at which the proposal was made
    //       at,
    //       // The planck denominated deposit made for the gov call
    //       balance,
    //       // Details about the specific proposal, including the call
    //       proposal,
    //        // the address that made the proposal
    //       proposer
    //   },
    //   imageHash,
    //   index,
    //   status: {
    //       // The block the referendum closes at
    //       end,
    //       // image hash
    //       proposalHash,
    //       // The kind of turnout is needed, ie 'SimplyMajority'
    //       threshold,
    //       // how many blocks after the end block that it takes for the proposal to get enacted
    //       delay,
    //       // The current tally of votes
    //       // @ts-ignore
    //       tally: {
    //           // planck denominated, conviction adjusted ayes
    //           ayes,
    //           // planck denominated, conviction adjusted nays
    //           nays,
    //           // planck denominated conviction adjusted total turnout
    //           turnout
    //       }
    //   },
    //   // list of accounts that voted aye
    //   allAye,
    //   // list of accounts that voted nay
    //   allNay,
    //   // the total amounts of votes
    //   voteCount,
    //   // the total amount of aye votes
    //   voteCountAye,
    //   // the total amount of nay votes
    //   voteCountNay,
    //   // the total amount of tokens voted aye
    //   votedAye,
    //   // the total amount of tokens voted nay
    //   votedNay,
    //   // the total amount of tokens voted
    //   votedTotal,
    //   // whether the proposal is currently passing
    //   isPassing,
    //   // the list of votes
    //   votes,
    // }
    const referendaQuery = await api.derive.democracy.referendums();

    return referendaQuery;
  };
}

export default ChainData;
