import { ApiPromise } from "@polkadot/api";
import ApiHandler from "./ApiHandler";

import {
  KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS,
  POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS,
  TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS,
} from "./constants";
import { getChainMetadata, getEraPoints, setOpenGovReferendum } from "./db";
import logger from "./logger";
import {
  AvailabilityCoreState,
  BooleanResult,
  Identity,
  NumberResult,
  StringResult,
  ConvictionVote,
  ConvictionDelegation,
  TrackInfo,
  OpenGovReferendum,
} from "./types";
import { getParaValIndex, hex2a, toDecimals } from "./util";
import type {
  Hash,
  ReferendumInfoTo239,
  Tally,
} from "@polkadot/types/interfaces";
import type {
  PalletDemocracyReferendumInfo,
  PalletDemocracyReferendumStatus,
  PalletDemocracyVoteVoting,
} from "@polkadot/types/lookup";

type JSON = any;

export class ChainData {
  public api: ApiPromise;

  constructor(handler: ApiHandler) {
    this.api = handler.getApi();
  }

  getChainType = async (): Promise<any> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const chainType = await this.api.rpc.system.chain();
    return chainType.toString();
  };

  // Returns the denomination of the chain. Used for formatting planck denomianted amounts
  getDenom = async (): Promise<number> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const chainType = await this.api.rpc.system.chain();
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;
    return denom;
  };

  getApiAt = async (blockNumber: number): Promise<any> => {
    const hash = await this.getBlockHash(blockNumber);
    return await this.api.at(hash);
  };

  getBlockHash = async (blockNumber: number): Promise<string> => {
    return (await this.api.rpc.chain.getBlockHash(blockNumber)).toString();
  };

  getBlock = async (blockNumber): Promise<any> => {
    const hash = await this.getBlockHash(blockNumber);
    return await this.api.rpc.chain.getBlock(hash);
  };

  // Given a block, return it's corresponding type (Primary, Secondary, Secondary VRF)
  getBlockType = (block: any): string => {
    const digest = block.block.header.digest;

    let type = "";
    if (digest.logs) {
      const blockType = digest?.logs[0]?.asPreRuntime[1]
        ?.toString()
        .substring(0, 4);

      switch (blockType) {
        case "0x01":
          type = "Primary";
          break;
        case "0x02":
          type = "Secondary";
          break;
        case "0x03":
          type = "Secondary VRF";
          break;
        default:
          break;
      }
    } else {
      logger.info(digest);
    }
    return type;
  };

  getSessionAt = async (apiAt: ApiPromise) => {
    const session = (await apiAt.query.session.currentIndex()).toString();
    return parseInt(session.replace(/,/g, ""));
  };

  getEraAt = async (apiAt: ApiPromise) => {
    return ((await apiAt.query.staking.activeEra()).toJSON() as any)
      .index as number;
  };

  getValidatorsAt = async (apiAt: ApiPromise): Promise<any> => {
    return (await apiAt.query.session.validators()).toHuman();
  };

  getValidatorGroupsAt = async (apiAt: ApiPromise): Promise<any> => {
    // The list of validator groups
    const validatorGroups = await apiAt.query.paraScheduler.validatorGroups();
    return validatorGroups.toHuman();
  };

  getParaIdsAt = async (apiAt: ApiPromise) => {
    // The list of parachain id's
    const paraIds: any = (await apiAt.query.paras.parachains()).toHuman();
    return paraIds;
  };

  getParaValIndicesAt = async (prevApiAt: ApiPromise) => {
    // There is an offset by one - need to query shared validator indices for the block before
    // @ts-ignore
    const paraValIndices = (
      await prevApiAt.query.parasShared.activeValidatorIndices()
    )
      .toHuman()
      // @ts-ignore
      .map((i) => {
        return Number(i);
      });
    return paraValIndices;
  };

  getAvailabilityCoreStatesAt = async (
    apiAt: ApiPromise,
    validatorGroups: any,
    validators: any,
    paraValIndices: any,
    blockNum: number
  ) => {
    // The scheduled availability cores and which validator groups are assigned to which parachains
    const scheduledAvailabilityCores = (
      await apiAt.query.paraScheduler.scheduled()
    ).toHuman() as any;

    const availabilityCoreStates: AvailabilityCoreState[] =
      scheduledAvailabilityCores.map((availabilityCore: any) => {
        const validatorGroup = validatorGroups[availabilityCore.groupIdx].map(
          (idx: number) => {
            return getParaValIndex(idx, validators, paraValIndices);
          }
        );
        return {
          blockNumber: blockNum,
          core: parseInt(availabilityCore.core),
          paraId: parseInt(availabilityCore.paraId.replace(/,/g, "")),
          kind: availabilityCore.kind,
          groupIdx: parseInt(availabilityCore.groupIdx),
          validators: validatorGroup,
        };
      });
    return availabilityCoreStates;
  };

  // Gets the active era index
  getActiveEraIndex = async (): Promise<NumberResult> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const activeEra = await this.api.query.staking.activeEra();
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const currentEra = await this.api.query.staking.currentEra();
    return Number(currentEra);
  };

  // Gets the commision for a given validator
  getCommission = async (validator: string): Promise<NumberResult> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const prefs = await this.api.query.staking.validators(validator);
    return [prefs.commission.toNumber(), null];
  };

  // Gets the validator preferences, and whether or not they block external nominations
  getBlocked = async (validator: string): Promise<any> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const prefs = (
      await this.api.query.staking.validators(validator)
    )?.blocked.toString();
    return prefs == "true";
  };

  destinationIsStaked = async (validatorStash: string): Promise<boolean> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const payee = await this.api.query.staking.payee(validatorStash);
    return payee.isStaked;
  };

  getCommissionInEra = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const prefs = await this.api.query.staking.erasValidatorPrefs(
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    // Get the denomination for this chain
    const denom = await this.getDenom();
    const account = await this.api.query.system.account(address);
    // Get the human formatted balance
    const balance = parseFloat(account.data.free.toString()) / denom;
    return [balance, null];
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const controller = await this.api.query.staking.bonded(stash);
    if (controller.isNone) {
      return [null, "Not bonded to any account."];
    }
    if (controller.toString() === stash) {
      return [
        null,
        `Bonded to itself, please follow recommendations and bond to a different controller. Stash: ${stash} | Controller ${controller.toString()}`,
      ];
    }

    const ledger: JSON = await this.api.query.staking.ledger(
      controller.toString()
    );
    if (ledger.isNone) {
      return [null, `Ledger is empty.`];
    }

    return [ledger.toJSON().active, null];
  };

  getNominators = async (): Promise<any> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const nominatorEntries = await this.api.query.staking.nominators.entries();
    const nominators = await Promise.all(
      nominatorEntries.map(async ([key, value]) => {
        const address = key.toHuman()[0];
        const controller = await this.api.query.staking.bonded(address);
        const denom = await this.getDenom();
        const bonded = (
          await this.api.query.staking.ledger(controller.toString())
        ).toJSON();
        // @ts-ignore
        const bondedAmount = bonded?.active ? bonded?.active / denom : 0;
        // @ts-ignore
        const targets = value?.toHuman()?.targets;
        return {
          address: address.toString(),
          bonded: bondedAmount,
          targets: targets,
        };
      })
    );
    return nominators;
  };

  getExposure = async (eraIndex: number, validator: string): Promise<any> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const denom = await this.getDenom();
    const eraStakers = await this.api.query.staking.erasStakers(
      eraIndex,
      validator
    );
    const total = parseFloat(eraStakers.total.toString()) / denom;
    // @ts-ignore
    const activeExposure = eraStakers.others.toJSON().map((stake) => {
      return {
        address: stake.who.toString(),
        bonded: stake.value / denom,
      };
    });
    return {
      total: total,
      others: activeExposure,
    };
  };

  getOwnExposure = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const exposure = await this.api.query.staking.erasStakers(
      eraIndex,
      validator
    );
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const earliestUnapplied =
      await this.api.query.staking.earliestUnappliedSlash();
    // @ts-ignore
    if (earliestUnapplied.isNone) {
      return [null, "Earliest unapplied is none."];
    }
    // @ts-ignore
    const earliestEraIndex = await earliestUnapplied.unwrap().toNumber();
    if (startEraIndex < earliestEraIndex) {
      return [null, `Start era is too early to query unapplied slashes.`];
    }

    const slashes = [];
    let curIndex = startEraIndex;
    while (curIndex <= endEraIndex) {
      const unappliedSlashes = await this.api.query.staking.unappliedSlashes(
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

    if (!this.api.isConnected) {
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

    const latestBlock = await this.api.rpc.chain.getBlock();
    if (era == activeEraIndex) {
      return [latestBlock.block.header.hash.toString(), null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.block.header.number.toNumber() - approxBlocksAgo;
    while (true && testBlockNumber > 0) {
      const blockHash = await this.api.rpc.chain.getBlockHash(
        parseInt(String(testBlockNumber))
      );
      const testEra = await this.api.query.staking.activeEra.at(blockHash);
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
    if (!this.api.isConnected) {
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

      const validators = await this.api.query.session.validators.at(blockHash);
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const validators = await this.api.query.session.validators();
    return validators.toJSON();
  };

  /**
   * Checks if an account has an identity set.
   * @param account The account to check.
   * @returns [hasIdentity, verified]
   */
  hasIdentity = async (account: string): Promise<[boolean, boolean]> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    let identity = await this.api.query.identity.identityOf(account);
    if (!identity.isSome) {
      // check if it's a sub
      const superOf = await this.api.query.identity.superOf(account);
      if (superOf.isSome) {
        identity = await this.api.query.identity.identityOf(
          superOf.unwrap()[0]
        );
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const identitiy = await this.api.query.identity.identityOf(account);
    if (!identitiy.isSome) {
      const superOf = await this.api.query.identity.superOf(account);
      if (superOf.isSome) {
        const id = await this.api.query.identity.identityOf(
          superOf.unwrap()[0]
        );
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    let identity: Identity, verified, sub;

    let superAccount;
    const subAccounts: { name: string; address: string }[] = [];
    const hasId = await this.api.derive.accounts.hasIdentity(addr);

    // The address is a sub identity
    if (hasId.hasIdentity && hasId.parentId) {
      const parentAddress = hasId.parentId;
      // the address is a subidentity, query the superIdentity
      const superIdentity = await this.api.derive.accounts.identity(
        parentAddress
      );
      superAccount = {
        name: superIdentity.display,
        address: parentAddress,
      };
      const {
        display,
        displayParent,
        email,
        image,
        judgements,
        legal,
        other,
        parent,
        pgp,
        riot,
        twitter,
        web,
      } = superIdentity;
      const subs = await this.api.query.identity.subsOf(parentAddress);

      // Iterate through all the sub accounts
      for (const subaccountAddress of subs[1]) {
        const identityQuery = await this.api.derive.accounts.identity(
          subaccountAddress
        );
        const subAccount: { name: string; address: string } = {
          name: identityQuery.display,
          address: subaccountAddress.toString(),
        };
        subAccounts.push(subAccount);
      }

      const judgementKinds = [];
      for (const judgement of judgements) {
        const status = judgement[1];
        if (status.isReasonable || status.isKnownGood) {
          judgementKinds.push(status.toString());
          verified = status.isReasonable || status.isKnownGood;
          continue;
        }
      }

      identity = {
        address: superAccount.address,
        name: superAccount.name,
        subIdentities: subAccounts,
        display,
        email,
        image,
        verified,
        judgements: judgementKinds,
        legal,
        pgp,
        riot,
        twitter,
        web,
      };
      return identity;
    } else if (hasId.hasIdentity) {
      const ident = await this.api.derive.accounts.identity(addr);
      const {
        display,
        displayParent,
        email,
        image,
        judgements,
        legal,
        other,
        parent,
        pgp,
        riot,
        twitter,
        web,
      } = ident;

      const judgementKinds = [];
      for (const judgement of judgements) {
        const status = judgement[1];
        if (status.isReasonable || status.isKnownGood) {
          judgementKinds.push(status.toString());
          verified = status.isReasonable || status.isKnownGood;
          continue;
        }
      }

      // Check to see if the address is a super-identity and has sub-identities
      const subidentities = await this.api.query.identity.subsOf(addr);
      if (subidentities[1].length > 0) {
        // This account has sub-identities
        for (const subaccountAddress of subidentities[1]) {
          const identityQuery = await this.api.derive.accounts.identity(
            subaccountAddress
          );
          const subAccount: { name: string; address: string } = {
            name: identityQuery.display,
            address: subaccountAddress.toString(),
          };
          subAccounts.push(subAccount);
        }
      }

      identity = {
        name: display,
        address: addr,
        verified,
        subIdentities: subAccounts,
        display,
        email,
        image,
        judgements: judgementKinds,
        legal,
        pgp,
        riot,
        twitter,
        web,
      };
      return identity;
    }
  };

  getStashFromController = async (
    controller: string
  ): Promise<string | null> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const ledger: JSON = await this.api.query.staking.ledger(controller);
    if (ledger.isNone) {
      return null;
    }

    return ledger.toJSON().stash;
  };

  getControllerFromStash = async (stash: string): Promise<string | null> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const controller = await this.api.query.staking.bonded(stash);
    return controller.toString();
  };

  getRewardDestination = async (stash: string): Promise<string | null> => {
    const rewardDestination: JSON = await this.api.query.staking.payee(stash);
    if (rewardDestination.toJSON().account) {
      return rewardDestination.toJSON().account;
    } else {
      return rewardDestination.toString();
    }
  };

  getQueuedKeys = async (): Promise<any> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const queuedKeys = await this.api.query.session.queuedKeys();
    const keys = queuedKeys.map(([validator, keys]) => {
      return {
        address: validator.toString(),
        keys: keys.toHex(),
      };
    });
    return keys;
  };

  getNextKeys = async (stash: string): Promise<string> => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const nextKeys = await this.api.query.session.nextKeys(stash);
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
  getNominationAt = async (nominatorStash: string, era: number) => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const chainMetadata = await getChainMetadata();
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
      await this.api.query.staking.nominators.at(blockhash, nominatorStash)
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

    const controller = await this.api.query.staking.bonded(nominatorStash);
    const bondedLedger = (
      await this.api.query.staking.ledger.at(blockhash, controller.toString())
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
  getUnclaimedEras = async (validatorStash: string) => {
    const start = Date.now();
    if (!this.api.isConnected) {
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

    const ledger: JSON = (
      await this.api.query.staking.ledger(controller)
    ).toJSON();
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
      const dbPoints = await getEraPoints(i, validatorStash);
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const erasRewardPoints = await this.api.query.staking.erasRewardPoints(era);
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const keys = await this.api.query.staking.validators.keys();
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString()
    );

    return validators;
  };

  getAssociatedValidatorAddresses = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const addresses = [];

    const keys = await this.api.query.staking.validators.keys();
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString()
    );
    for (const validator of validators) {
      if (!addresses.includes(validator.toString())) {
        addresses.push(validator.toString());
      }
      const controller = await this.getControllerFromStash(validator);
      if (!addresses.includes(controller.toString())) {
        addresses.push(controller.toString());
      }
    }

    return addresses;
  };

  /**
   * Gets the current session
   * @returns session as number
   */
  getSession = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const session = await this.api.query.session.currentIndex();
    return Number(session.toString());
  };

  getBalance = async (address: string) => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const balance = this.api.query.system.account(address);
    return (await balance).data.toJSON();
  };

  getProxyAnnouncements = async (address: string) => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const announcements = await this.api.query.proxy.announcements(address);
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    return (await this.api.rpc.chain.getBlock()).block.header.number.toNumber();
  };

  getLatestBlockHash = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const latestBlock = await this.api.rpc.chain.getBlock();
    return latestBlock.block.header.hash.toString();
  };

  // gets the votes and stake amount of voting for council elections
  getCouncilVoting = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const voteQuery = await this.api.derive.council.votes();
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
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const electionsQuery = await this.api.derive.elections.info();
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

  // Legacy Referendum Info
  // getRerendumInfo = async (referendumIndex: number) => {
  //   if (!this.api.isConnected) {
  //     logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
  //     return;
  //   }
  //   const referendumInfo = await this.api.query.democracy.referendumInfoOf(
  //     referendumIndex
  //   );
  //
  //   const referendum = await this.api.query.democracy.referendumInfoOf(248);
  //   const isFinished = referendum.unwrap().isFinished;
  //   const isOngoing = referendum.unwrap().isOngoing;
  //   if (isFinished) {
  //     const { approved, end } = referendum.unwrap().asFinished;
  //   } else if (isOngoing) {
  //     const asOngoing = referendum.unwrap().asOngoing;
  //     const {
  //       end,
  //       proposal,
  //       threshold,
  //       delay,
  //       tally: { ayes, nays, turnout },
  //     } = asOngoing;
  //
  //     const isLegacy = proposal.isLegacy;
  //     if (isLegacy) {
  //       const { hash_: proposalHash } = proposal.asLegacy;
  //       console.log(proposalHash);
  //     }
  //
  //     const proposalHash =
  //       (asOngoing as PalletDemocracyReferendumStatus).proposal ||
  //       (asOngoing as unknown as { proposalHash: Hash }).proposalHash;
  //
  //     const status = {
  //       end,
  //       threshold,
  //       delay,
  //     };
  //
  //     const preimage = await this.api.query.democracy.preimages(proposalHash);
  //     const { data, provider, deposit, since, expiry } =
  //       preimage.unwrap().asAvailable;
  //   }
  // };

  // Returns the response from the derive referenda query
  getDerivedReferenda = async () => {
    if (!this.api.isConnected) {
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
    const referendaQuery = await this.api.derive.democracy.referendums();

    return referendaQuery;
  };

  getOpenGovReferenda = async () => {
    const ongoingReferenda = [];
    const finishedReferenda = [];
    const referenda =
      await this.api.query.referenda.referendumInfoFor.entries();
    for (const [key, info] of referenda) {
      const index = parseInt(key.toHuman()[0]);

      const trackJSON = info.toJSON();
      if (trackJSON["ongoing"]) {
        const {
          track,
          origin: { origins },
          proposal: {
            lookup: { hash },
          },
          enactment: { after },
          submitted,
          submissionDeposit: { who: submissionWho, amount: submissionAmount },
          decisionDeposit,
          deciding,
          tally: { ayes, nays, support },
          inQueue,
          alarm,
        } = trackJSON["ongoing"];
        let decisionDepositWho, decisionDepositAmount, since, confirming;
        if (decisionDeposit) {
          const { who: decisionDepositWho, amount: decisionDepositAmount } =
            decisionDeposit;
        }
        if (deciding) {
          const { since, confirming } = deciding;
        }

        const r: OpenGovReferendum = {
          index: index,
          track: track,
          origin: origins,
          proposalHash: hash,
          enactmentAfter: after,
          submitted: submitted,
          submissionWho: submissionWho,
          submissionAmount: submissionAmount,
          decisionDepositWho: decisionDepositWho ? decisionDepositWho : null,
          decisionDepositAmount: decisionDepositAmount
            ? decisionDepositAmount
            : null,
          decidingSince: since ? since : null,
          decidingConfirming: confirming ? confirming : null,
          ayes: ayes,
          nays: nays,
          support: support,
          inQueue: inQueue,
          currentStatus: "Ongoing",
          confirmationBlockNumber: null,
        };
        ongoingReferenda.push(r);
      } else if (
        trackJSON["approved"] ||
        trackJSON["cancelled"] ||
        trackJSON["rejected"] ||
        trackJSON["timedOut"]
      ) {
        let status, confirmationBlockNumber;
        if (trackJSON["approved"]) {
          confirmationBlockNumber = trackJSON["approved"][0];
          status = "Approved";
        } else if (trackJSON["cancelled"]) {
          confirmationBlockNumber = trackJSON["cancelled"][0];
          status = "Cancelled";
        } else if (trackJSON["rejected"]) {
          confirmationBlockNumber = trackJSON["rejected"][0];
          status = "Rejected";
        } else if (trackJSON["timedOut"]) {
          confirmationBlockNumber = trackJSON["timedOut"][0];
          status = "TimedOut";
        }

        const apiAt = await this.getApiAt(confirmationBlockNumber - 1);
        // Get the info at the last block before it closed.
        const referendumInfo = await apiAt.query.referenda.referendumInfoFor(
          index
        );
        const referendumJSON = referendumInfo.toJSON();

        const {
          track,
          origin: { origins },
          proposal: {
            lookup: { hash },
          },
          enactment: { after },
          submitted,
          submissionDeposit: { who: submissionWho, amount: submissionAmount },
          decisionDeposit,
          deciding,
          tally: { ayes, nays, support },
          inQueue,
          alarm,
        } = referendumJSON["ongoing"];
        let decisionDepositWho, decisionDepositAmount, since, confirming;
        if (decisionDeposit) {
          const { who: decisionDepositWho, amount: decisionDepositAmount } =
            decisionDeposit;
        }
        if (deciding) {
          const { since, confirming } = deciding;
        }

        const r: OpenGovReferendum = {
          index: index,
          track: track,
          origin: origins,
          proposalHash: hash,
          enactmentAfter: after,
          submitted: submitted,
          submissionWho: submissionWho,
          submissionAmount: submissionAmount,
          decisionDepositWho: decisionDepositWho ? decisionDepositWho : null,
          decisionDepositAmount: decisionDepositAmount
            ? decisionDepositAmount
            : null,
          decidingSince: since ? since : null,
          decidingConfirming: confirming ? confirming : null,
          ayes: ayes,
          nays: nays,
          support: support,
          inQueue: inQueue,
          currentStatus: status,
          confirmationBlockNumber: confirmationBlockNumber,
        };

        finishedReferenda.push(r);
      }
    }
    return {
      ongoingReferenda: ongoingReferenda,
      finishedReferenda: finishedReferenda,
    };
  };

  getTrackInfo = async () => {
    const trackTypes = [];
    const tracks = await this.api.consts.referenda.tracks;

    for (const [trackIndex, trackInfo] of tracks) {
      const {
        name,
        maxDeciding,
        decisionDeposit,
        preparePeriod,
        decisionPeriod,
        confirmPeriod,
        minEnactmentPeriod,
        minApproval,
        minSupport,
      } = trackInfo;
      const t: TrackInfo = {
        trackIndex: trackIndex.toString(),
        name: name.toString(),
        maxDeciding: parseFloat(maxDeciding.toString()),
        decisionDeposit: parseFloat(decisionDeposit.toString()),
        preparePeriod: parseFloat(preparePeriod.toString()),
        decisionPeriod: parseFloat(decisionPeriod.toString()),
        confirmPeriod: parseFloat(confirmPeriod.toString()),
        minEnactmentPeriod: parseFloat(confirmPeriod.toString()),
        // minApproval,
        // minSupport
      };
      trackTypes.push(t);
    }
    return trackTypes;
  };

  getOpenGovDelegations = async () => {
    const denom = await this.getDenom();
    const allDelegations = [];
    const votingFor = await this.api.query.convictionVoting.votingFor.entries();
    for (const [key, entry] of votingFor) {
      // Each of these is the votingFor for an account for a given governance track
      // @ts-ignore
      const [address, track] = key.toHuman();

      // For each track, an account is either voting themselves, or delegating to another account

      // The account is voting themselves
      // @ts-ignore
      if (entry.isDelegating) {
        // The address is delegating to another address for this particular track

        const {
          balance,
          target,
          conviction,
          delegations: { votes: delegationVotes, capital: delegationCapital },
          prior,
          // @ts-ignore
        } = entry.asDelegating;

        let effectiveBalance = 0;
        switch (conviction.toString()) {
          case "None":
            {
              effectiveBalance = (balance / denom) * 0.1;
            }
            break;
          case "Locked1x":
            {
              effectiveBalance = balance / denom;
            }
            break;
          case "Locked2x":
            {
              effectiveBalance = (balance / denom) * 2;
            }
            break;
          case "Locked3x":
            {
              effectiveBalance = (balance / denom) * 3;
            }
            break;
          case "Locked4x":
            {
              effectiveBalance = (balance / denom) * 4;
            }
            break;
          case "Locked5x":
            {
              effectiveBalance = (balance / denom) * 5;
            }
            break;
          case "Locked6x":
            {
              effectiveBalance = (balance / denom) * 6;
            }
            break;
        }
        const delegation: ConvictionDelegation = {
          track: track,
          address: address.toString(),
          target: target.toString(),
          balance: balance.toString() / denom,
          effectiveBalance: effectiveBalance,
          conviction: conviction.toString(),
          // The total amount of tokens that were delegated to them (including conviction)
          delegatedConvictionBalance: delegationVotes.toString(),
          // the total amount of tokens that were delegated to them (without conviction)
          delegatedBalance: delegationCapital.toString(),
          prior: prior,
        };
        allDelegations.push(delegation);
      }
    }
    return allDelegations;
  };

  // OpenGov Conviction Voting
  getConvictionVoting = async () => {
    const finishedVotes: ConvictionVote[] = [];
    const ongoingVotes: ConvictionVote[] = [];
    const allDelegations: ConvictionDelegation[] = [];

    const denom = await this.getDenom();

    // Create a map to more easily check the status of a referenda, is it ongoing or finished
    const referendaMap = new Map();
    const { ongoingReferenda, finishedReferenda } =
      await this.getOpenGovReferenda();
    for (const ref of ongoingReferenda) {
      referendaMap.set(ref.index, ref);
    }
    for (const ref of finishedReferenda) {
      referendaMap.set(ref.index, ref);
    }
    for (const r of finishedReferenda) {
      logger.info(`Democracy: ${r.index}`);
    }

    const tracks = this.api.consts.referenda.tracks;

    // Query the keys and storage of all the entries of `votingFor`
    // These are all the accounts voting, for which tracks, for which referenda
    // And whether they are delegating or not.
    const votingFor = await this.api.query.convictionVoting.votingFor.entries();
    for (const [key, entry] of votingFor) {
      // Each of these is the votingFor for an account for a given governance track
      // @ts-ignore
      const [address, track] = key.toHuman();

      // For each track, an account is either voting themselves, or delegating to another account

      // The account is voting themselves
      // @ts-ignore
      if (entry.isCasting) {
        // For each given track, these are the invididual votes for that track,
        //     as well as the total delegation amounts for that particular track
        // @ts-ignore
        const { votes, delegations } = entry.asCasting;

        // The total delegation amounts.
        //     delegationVotes - the _total_ amount of tokens applied in voting. This takes the conviction into account
        //     delegationCapital - the base level of tokens delegated to this address
        const { votes: delegationVotes, capital: delegationCapital } =
          delegations;

        // The list of votes for that track
        for (const referendumVote of votes) {
          // The vote for each referendum - this is the referendum index,the conviction, the vote type (aye,nay), and the balance
          const [referendumIndex, voteType] = referendumVote;

          const isReferendumFinished =
            referendaMap.get(parseInt(referendumIndex))?.currentStatus !=
            "Ongoing";
          const isReferendumOngoing =
            referendaMap.get(parseInt(referendumIndex))?.currentStatus ==
            "Ongoing";
          let v: ConvictionVote;
          if (voteType.isStandard) {
            const { vote: refVote, balance } = voteType.asStandard;
            const { conviction, vote: voteDirection } = refVote.toHuman();

            // The formatted vote
            v = {
              // The particular governance track
              track: Number(track.toString()),
              // The account that is voting
              address: address.toString(),
              // The index of the referendum
              referendumIndex: Number(referendumIndex.toString()),
              // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
              conviction: conviction.toString(),
              // The balance they are voting with themselves, sans delegated balance
              balance: {
                aye:
                  voteDirection.toString() == "Aye"
                    ? Number(balance.toJSON()) / denom
                    : 0,
                nay:
                  voteDirection.toString() == "Nay"
                    ? Number(balance.toJSON()) / denom
                    : 0,
                abstain: 0,
              },
              // The total amount of tokens that were delegated to them (including conviction)
              delegatedConvictionBalance:
                Number(delegationVotes.toString()) / denom,
              // the total amount of tokens that were delegated to them (without conviction)
              delegatedBalance: Number(delegationCapital.toString()) / denom,
              // The vote type, either 'aye', or 'nay'
              voteDirection: voteDirection.toString(),
              // The vote direction type, either "Standard", "Split", or "SplitAbstain"
              voteDirectionType: "Standard",
              // Whether the person is voting themselves or delegating
              voteType: "Casting",
              // Who the person is delegating to
              delegatedTo: null,
            };
          } else if (voteType.isSplit) {
            const { aye, nay } = voteType.asSplit;

            // The formatted vote
            v = {
              // The particular governance track
              track: Number(track.toString()),
              // The account that is voting
              address: address.toString(),
              // The index of the referendum
              referendumIndex: Number(referendumIndex.toString()),
              // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
              conviction: "Locked1x",
              // The balance they are voting with themselves, sans delegated balance
              balance: {
                aye: Number(aye.toString()) / denom,
                nay: Number(nay.toString()) / denom,
                abstain: 0,
              },
              // The total amount of tokens that were delegated to them (including conviction)
              delegatedConvictionBalance:
                Number(delegationVotes.toString()) / denom,
              // the total amount of tokens that were delegated to them (without conviction)
              delegatedBalance: Number(delegationCapital.toString()) / denom,
              // The vote type, either 'aye', or 'nay'
              voteDirection: aye >= nay ? "Aye" : "Nay",
              // The vote direction type, either "Standard", "Split", or "SplitAbstain"
              voteDirectionType: "Split",
              // Whether the person is voting themselves or delegating
              voteType: "Casting",
              // Who the person is delegating to
              delegatedTo: null,
            };
          } else {
            const voteJSON = voteType.toJSON();

            if (voteJSON["splitAbstain"]) {
              const { aye, nay, abstain } = voteJSON["splitAbstain"];
              // The formatted vote
              v = {
                // The particular governance track
                track: Number(track.toString()),
                // The account that is voting
                address: address.toString(),
                // The index of the referendum
                referendumIndex: Number(referendumIndex.toString()),
                // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                conviction: "Locked1x",
                // The balance they are voting with themselves, sans delegated balance
                balance: {
                  aye: Number(aye) / denom,
                  nay: Number(nay) / denom,
                  abstain: Number(abstain) / denom,
                },
                // The total amount of tokens that were delegated to them (including conviction)
                delegatedConvictionBalance:
                  Number(delegationVotes.toString()) / denom,
                // the total amount of tokens that were delegated to them (without conviction)
                delegatedBalance: Number(delegationCapital.toString()) / denom,
                // The vote type, either 'aye', or 'nay'
                voteDirection:
                  abstain >= aye && abstain >= nay
                    ? "Abstain"
                    : aye > +nay
                    ? "Aye"
                    : "Nay",
                // The vote direction type, either "Standard", "Split", or "SplitAbstain"
                voteDirectionType: "SplitAbstain",
                // Whether the person is voting themselves or delegating
                voteType: "Casting",
                // Who the person is delegating to
                delegatedTo: null,
              };
            }
          }
          // if (isReferendumFinished) finishedVotes.push(v);
          if (isReferendumOngoing) ongoingVotes.push(v);
        }
        // @ts-ignore
      } else if (entry.isDelegating) {
        // The address is delegating to another address for this particular track

        const {
          balance,
          target,
          conviction,
          delegations: { votes: delegationVotes, capital: delegationCapital },
          prior,
          // @ts-ignore
        } = entry.asDelegating;
        let effectiveBalance = 0;
        switch (conviction) {
          case "None":
            {
              effectiveBalance = (balance / denom) * 0.1;
            }
            break;
          case "Locked1x":
            {
              effectiveBalance = balance / denom;
            }
            break;
          case "Locked2x":
            {
              effectiveBalance = (balance / denom) * 2;
            }
            break;
          case "Locked3x":
            {
              effectiveBalance = (balance / denom) * 3;
            }
            break;
          case "Locked4x":
            {
              effectiveBalance = (balance / denom) * 4;
            }
            break;
          case "Locked5x":
            {
              effectiveBalance = (balance / denom) * 5;
            }
            break;
          case "Locked6x":
            {
              effectiveBalance = (balance / denom) * 6;
            }
            break;
        }
        const delegation: ConvictionDelegation = {
          track: track,
          address: address.toString(),
          target: target.toString(),
          balance: parseInt(balance.toString()) / denom,
          effectiveBalance: effectiveBalance,
          conviction: conviction.toString(),
          // The total amount of tokens that were delegated to them (including conviction)
          delegatedConvictionBalance: delegationVotes.toString(),
          // the total amount of tokens that were delegated to them (without conviction)
          delegatedBalance: delegationCapital.toString(),
          prior: prior,
        };
        allDelegations.push(delegation);
      }
    }

    // ONGOING REFERENDA DELEGATIONS
    // Create a vote entry for everyone that is delegating for current ongoing referenda
    for (const delegation of allDelegations) {
      // Find the vote of the person they are delegating to for a given track
      const v = ongoingVotes.filter((vote) => {
        return (
          vote.address == delegation.target && vote.track == delegation.track
        );
      });
      if (v.length > 0) {
        // There are votes for a given track that a person delegating will have votes for.
        for (const vote of v) {
          const voteDirectionType = vote.voteDirectionType;
          let balance;

          switch (voteDirectionType) {
            case "Aye":
              balance = {
                aye: Number(delegation.balance),
                nay: Number(0),
                abstain: Number(0),
              };
              break;
            case "Nay":
              balance = {
                aye: Number(0),
                nay: Number(delegation.balance),
                abstain: Number(0),
              };
              break;
            case "Split":
              balance = {
                aye:
                  Number(delegation.balance) *
                  (vote.balance.aye / (vote.balance.aye + vote.balance.nay)),
                nay:
                  Number(delegation.balance) *
                  (vote.balance.nay / (vote.balance.aye + vote.balance.nay)),
                abstain: Number(0),
              };
            case "SplitAbstain":
              const ayePercentage =
                vote.balance.aye /
                (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
              const nayPercentage =
                vote.balance.nay /
                (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
              const abstainPercentage =
                vote.balance.nay /
                (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
              balance = {
                aye: Number(delegation.balance) * ayePercentage,
                nay: Number(delegation.balance) * nayPercentage,
                abstain: Number(delegation.balance) * abstainPercentage,
              };
              break;
          }

          const delegatedVote: ConvictionVote = {
            // The particular governance track
            track: vote.track,
            // The account that is voting
            address: delegation.address,
            // The index of the referendum
            referendumIndex: vote.referendumIndex,
            // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
            conviction: delegation.conviction,
            // The balance they are voting with themselves, sans delegated balance
            balance: balance,
            // The total amount of tokens that were delegated to them (including conviction)
            delegatedConvictionBalance: delegation.delegatedConvictionBalance,
            // the total amount of tokens that were delegated to them (without conviction)
            delegatedBalance: delegation.delegatedBalance,
            // The vote type, either 'aye', or 'nay'
            voteDirection: vote.voteDirection,
            // Whether the person is voting themselves or delegating
            voteType: "Delegating",
            voteDirectionType: voteDirectionType,
            // Who the person is delegating to
            delegatedTo: vote.address,
          };
          ongoingVotes.push(delegatedVote);
        }
      } else if (v.length == 0) {
        // There are no direct votes from the person the delegator is delegating to,
        // but that person may also be delegating, so search for nested delegations

        let found = false;
        // The end vote of the chain of delegations
        let delegatedVote;

        delegatedVote = delegation;
        while (!found) {
          // Find the delegation of the person who is delegating to
          const d = allDelegations.filter((del) => {
            return (
              del.address == delegatedVote.target &&
              del.track == delegatedVote.track
            );
          });

          if (d.length == 0) {
            // There are no additional delegations, try to find if there are any votes

            found = true;
            const v = ongoingVotes.filter((vote) => {
              return (
                vote.address == delegatedVote.target &&
                vote.track == delegatedVote.track
              );
            });
            if (v.length > 0) {
              // There are votes, ascribe them to the delegator
              for (const vote of v) {
                const voteDirectionType = vote.voteDirectionType;
                let balance;
                switch (voteDirectionType) {
                  case "Aye":
                    balance = {
                      aye: Number(delegation.balance),
                      nay: Number(0),
                      abstain: Number(0),
                    };
                    break;
                  case "Nay":
                    balance = {
                      aye: Number(0),
                      nay: Number(delegation.balance),
                      abstain: Number(0),
                    };
                    break;
                  case "Split":
                    balance = {
                      aye:
                        Number(delegation.balance) *
                        (vote.balance.aye /
                          (vote.balance.aye + vote.balance.nay)),
                      nay:
                        Number(delegation.balance) *
                        (vote.balance.nay /
                          (vote.balance.aye + vote.balance.nay)),
                      abstain: Number(0),
                    };
                  case "SplitAbstain":
                    const ayePercentage =
                      vote.balance.aye /
                      (vote.balance.aye +
                        vote.balance.nay +
                        vote.balance.abstain);
                    const nayPercentage =
                      vote.balance.nay /
                      (vote.balance.aye +
                        vote.balance.nay +
                        vote.balance.abstain);
                    const abstainPercentage =
                      vote.balance.nay /
                      (vote.balance.aye +
                        vote.balance.nay +
                        vote.balance.abstain);
                    balance = {
                      aye: Number(delegation.balance) * ayePercentage,
                      nay: Number(delegation.balance) * nayPercentage,
                      abstain: Number(delegation.balance) * abstainPercentage,
                    };
                    break;
                }

                const delegatedVote: ConvictionVote = {
                  // The particular governance track
                  track: vote.track,
                  // The account that is voting
                  address: delegation.address,
                  // The index of the referendum
                  referendumIndex: vote.referendumIndex,
                  // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                  conviction: delegation.conviction,
                  // The balance they are voting with themselves, sans delegated balance
                  balance: balance,
                  // The total amount of tokens that were delegated to them (including conviction)
                  delegatedConvictionBalance:
                    delegation.delegatedConvictionBalance,
                  // the total amount of tokens that were delegated to them (without conviction)
                  delegatedBalance: delegation.delegatedBalance,
                  // The vote type, either 'aye', or 'nay'
                  voteDirection: vote.voteDirection,
                  // Whether the person is voting themselves or delegating
                  voteType: "Delegating",
                  voteDirectionType: voteDirectionType,
                  // Who the person is delegating to
                  delegatedTo: vote.address,
                };
                ongoingVotes.push(delegatedVote);
              }
            } else {
              // The person they are delegating to does not have any votes.
            }
          } else if (d.length == 1) {
            // There is a delegated delegation
            delegatedVote = d[0];
          }
        }
      }
    }

    // FINISHED REFERENDA
    // Query the delegations for finished referenda at previous block heights
    for (const [finishedRefIndex, referendum] of finishedReferenda.entries()) {
      const apiAt = await this.getApiAt(referendum.confirmationBlockNumber - 1);

      const votingFor = await apiAt.query.convictionVoting.votingFor.entries();

      const delegationsAt = [];
      const nestedDelegations = [];
      const refVotes = [];

      // Make a list of the delegations there were at this previous block height
      for (const [key, entry] of votingFor) {
        // Each of these is the votingFor for an account for a given governance track
        // @ts-ignore
        const [address, track] = key.toHuman();
        if (entry.isCasting) {
          // For each given track, these are the invididual votes for that track,
          //     as well as the total delegation amounts for that particular track
          // @ts-ignore
          const { votes, delegations } = entry.asCasting;

          // The total delegation amounts.
          //     delegationVotes - the _total_ amount of tokens applied in voting. This takes the conviction into account
          //     delegationCapital - the base level of tokens delegated to this address
          const { votes: delegationVotes, capital: delegationCapital } =
            delegations;

          // push the given referendum votes to refVotes
          for (const referendumVote of votes) {
            // The vote for each referendum - this is the referendum index,the conviction, the vote type (aye,nay), and the balance
            const [referendumIndex, voteType] = referendumVote;
            if (referendumIndex == referendum.index) {
              let v: ConvictionVote;
              if (voteType.isStandard) {
                const { vote: refVote, balance } = voteType.asStandard;
                const { conviction, vote: voteDirection } = refVote.toHuman();

                // The formatted vote
                v = {
                  // The particular governance track
                  track: Number(track.toString()),
                  // The account that is voting
                  address: address.toString(),
                  // The index of the referendum
                  referendumIndex: Number(referendumIndex.toString()),
                  // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                  conviction: conviction.toString(),
                  // The balance they are voting with themselves, sans delegated balance
                  balance: {
                    aye:
                      voteDirection.toString() == "Aye"
                        ? Number(balance.toJSON()) / denom
                        : 0,
                    nay:
                      voteDirection.toString() == "Nay"
                        ? Number(balance.toJSON()) / denom
                        : 0,
                    abstain: 0,
                  },
                  // The total amount of tokens that were delegated to them (including conviction)
                  delegatedConvictionBalance:
                    Number(delegationVotes.toString()) / denom,
                  // the total amount of tokens that were delegated to them (without conviction)
                  delegatedBalance:
                    Number(delegationCapital.toString()) / denom,
                  // The vote type, either 'aye', or 'nay'
                  voteDirection: voteDirection.toString(),
                  // The vote direction type, either "Standard", "Split", or "SplitAbstain"
                  voteDirectionType: "Standard",
                  // Whether the person is voting themselves or delegating
                  voteType: "Casting",
                  // Who the person is delegating to
                  delegatedTo: null,
                };
              } else if (voteType.isSplit) {
                const { aye, nay } = voteType.asSplit;

                // The formatted vote
                v = {
                  // The particular governance track
                  track: Number(track.toString()),
                  // The account that is voting
                  address: address.toString(),
                  // The index of the referendum
                  referendumIndex: Number(referendumIndex.toString()),
                  // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                  conviction: "Locked1x",
                  // The balance they are voting with themselves, sans delegated balance
                  balance: {
                    aye: Number(aye) / denom,
                    nay: Number(nay) / denom,
                    abstain: 0,
                  },
                  // The total amount of tokens that were delegated to them (including conviction)
                  delegatedConvictionBalance:
                    Number(delegationVotes.toString()) / denom,
                  // the total amount of tokens that were delegated to them (without conviction)
                  delegatedBalance:
                    Number(delegationCapital.toString()) / denom,
                  // The vote type, either 'aye', or 'nay'
                  voteDirection: aye >= nay ? "Aye" : "Nay",
                  // The vote direction type, either "Standard", "Split", or "SplitAbstain"
                  voteDirectionType: "Split",
                  // Whether the person is voting themselves or delegating
                  voteType: "Casting",
                  // Who the person is delegating to
                  delegatedTo: null,
                };
              } else {
                const voteJSON = voteType.toJSON();

                if (voteJSON["splitAbstain"]) {
                  const { aye, nay, abstain } = voteJSON["splitAbstain"];
                  // The formatted vote
                  v = {
                    // The particular governance track
                    track: Number(track.toString()),
                    // The account that is voting
                    address: address.toString(),
                    // The index of the referendum
                    referendumIndex: Number(referendumIndex.toString()),
                    // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                    conviction: "Locked1x",
                    // The balance they are voting with themselves, sans delegated balance
                    balance: {
                      aye: Number(aye) / denom,
                      nay: Number(nay) / denom,
                      abstain: Number(abstain) / denom,
                    },
                    // The total amount of tokens that were delegated to them (including conviction)
                    delegatedConvictionBalance:
                      Number(delegationVotes.toString()) / denom,
                    // the total amount of tokens that were delegated to them (without conviction)
                    delegatedBalance:
                      Number(delegationCapital.toString()) / denom,
                    // The vote type, either 'aye', or 'nay'
                    voteDirection:
                      abstain >= aye && abstain >= nay
                        ? "Abstain"
                        : aye > +nay
                        ? "Aye"
                        : "Nay",
                    // The vote direction type, either "Standard", "Split", or "SplitAbstain"
                    voteDirectionType: "SplitAbstain",
                    // Whether the person is voting themselves or delegating
                    voteType: "Casting",
                    // Who the person is delegating to
                    delegatedTo: null,
                  };
                }
              }
              finishedVotes.push(v);
              refVotes.push(v);
            }
          }
        }
      }

      // Make a list of the delegations there were at this previous block height
      for (const [key, entry] of votingFor) {
        // Each of these is the votingFor for an account for a given governance track
        // @ts-ignore
        const [address, track] = key.toHuman();
        // @ts-ignore
        if (entry.isDelegating) {
          // The address is delegating to another address for this particular track
          const {
            balance,
            target,
            conviction,
            delegations: { votes: delegationVotes, capital: delegationCapital },
            prior,
            // @ts-ignore
          } = entry.asDelegating;
          let effectiveBalance = 0;
          switch (conviction) {
            case "None":
              {
                effectiveBalance = (balance / denom) * 0.1;
              }
              break;
            case "Locked1x":
              {
                effectiveBalance = balance / denom;
              }
              break;
            case "Locked2x":
              {
                effectiveBalance = (balance / denom) * 2;
              }
              break;
            case "Locked3x":
              {
                effectiveBalance = (balance / denom) * 3;
              }
              break;
            case "Locked4x":
              {
                effectiveBalance = (balance / denom) * 4;
              }
              break;
            case "Locked5x":
              {
                effectiveBalance = (balance / denom) * 5;
              }
              break;
            case "Locked6x":
              {
                effectiveBalance = (balance / denom) * 6;
              }
              break;
          }
          const delegation: ConvictionDelegation = {
            track: track,
            address: address.toString(),
            target: target.toString(),
            balance: balance.toString() / denom,
            effectiveBalance: effectiveBalance,
            conviction: conviction.toString(),
            // The total amount of tokens that were delegated to them (including conviction)
            delegatedConvictionBalance: delegationVotes.toString() / denom,
            // the total amount of tokens that were delegated to them (without conviction)
            delegatedBalance: delegationCapital.toString() / denom,
            prior: prior,
          };
          delegationsAt.push(delegation);
        }
      }

      // Go through the list of delegations and try to find any corresponding direct votes
      for (const delegation of delegationsAt) {
        // Try and find the delegated vote from the existing votes
        const v = refVotes.filter((vote) => {
          return (
            vote.referendumIndex == referendum.index &&
            vote.address == delegation.target &&
            vote.track == delegation.track
          );
        });
        if (v.length > 0) {
          // There are votes for a given track that a person delegating will have votes for.
          for (const vote of v) {
            const voteDirectionType = vote.voteDirectionType;
            let balance;
            switch (voteDirectionType) {
              case "Aye":
                balance = {
                  aye: Number(delegation.balance),
                  nay: Number(0),
                  abstain: Number(0),
                };
                break;
              case "Nay":
                balance = {
                  aye: Number(0),
                  nay: Number(delegation.balance),
                  abstain: Number(0),
                };
                break;
              case "Split":
                balance = {
                  aye:
                    Number(delegation.balance) *
                    (vote.balance.aye / (vote.balance.aye + vote.balance.nay)),
                  nay:
                    Number(delegation.balance) *
                    (vote.balance.nay / (vote.balance.aye + vote.balance.nay)),
                  abstain: Number(0),
                };
              case "SplitAbstain":
                const ayePercentage =
                  vote.balance.aye /
                  (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
                const nayPercentage =
                  vote.balance.nay /
                  (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
                const abstainPercentage =
                  vote.balance.nay /
                  (vote.balance.aye + vote.balance.nay + vote.balance.abstain);
                balance = {
                  aye: Number(delegation.balance) * ayePercentage,
                  nay: Number(delegation.balance) * nayPercentage,
                  abstain: Number(delegation.balance) * abstainPercentage,
                };
                break;
            }

            const delegatedVote: ConvictionVote = {
              // The particular governance track
              track: vote.track,
              // The account that is voting
              address: delegation.address,
              // The index of the referendum
              referendumIndex: vote.referendumIndex,
              // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
              conviction: delegation.conviction,
              // The balance they are voting with themselves, sans delegated balance
              balance: balance,
              // The total amount of tokens that were delegated to them (including conviction)
              delegatedConvictionBalance: delegation.delegatedConvictionBalance,
              // the total amount of tokens that were delegated to them (without conviction)
              delegatedBalance: delegation.delegatedBalance,
              // The vote type, either 'aye', or 'nay'
              voteDirection: vote.voteDirection,
              // Whether the person is voting themselves or delegating
              voteType: "Delegating",
              voteDirectionType: voteDirectionType,
              // Who the person is delegating to
              delegatedTo: vote.address,
            };
            finishedVotes.push(delegatedVote);
          }
        } else {
          // There are no direct delegations, though there may be a nested delegation
          nestedDelegations.push(delegation);
        }
      }

      // Go through the list of nested delegations and try to resolve any votes
      for (const delegation of nestedDelegations) {
        // Try and find the delegated vote from the existing votes
        const v = refVotes.filter((vote) => {
          return (
            vote.referendumIndex == referendum.index &&
            vote.address == delegation.target &&
            vote.track == delegation.track
          );
        });
        if (v.length == 0) {
          // There are no direct votes from the person the delegator is delegating to,
          // but that person may also be delegating, so search for nested delegations

          let found = false;
          // The end vote of the chain of delegations
          let delegatedVote;

          delegatedVote = delegation;
          while (!found) {
            // Find the delegation of the person who is delegating to
            const d = delegationsAt.filter((del) => {
              return (
                del.address == delegatedVote.target &&
                del.track == delegatedVote.track
              );
            });

            if (d.length == 0) {
              // There are no additional delegations, try to find if there are any votes

              found = true;
              const v = refVotes.filter((vote) => {
                return (
                  vote.referendumIndex == referendum.index &&
                  vote.address == delegatedVote.target &&
                  vote.track == delegatedVote.track
                );
              });
              if (v.length > 0) {
                // There are votes, ascribe them to the delegator
                for (const vote of v) {
                  const voteDirectionType = vote.voteDirectionType;
                  let balance;
                  switch (voteDirectionType) {
                    case "Aye":
                      balance = {
                        aye: Number(delegation.balance),
                        nay: Number(0),
                        abstain: Number(0),
                      };
                      break;
                    case "Nay":
                      balance = {
                        aye: Number(0),
                        nay: Number(delegation.balance),
                        abstain: Number(0),
                      };
                      break;
                    case "Split":
                      balance = {
                        aye:
                          Number(delegation.balance) *
                          (vote.balance.aye /
                            (vote.balance.aye + vote.balance.nay)),
                        nay:
                          Number(delegation.balance) *
                          (vote.balance.nay /
                            (vote.balance.aye + vote.balance.nay)),
                        abstain: Number(0),
                      };
                    case "SplitAbstain":
                      const ayePercentage =
                        vote.balance.aye /
                        (vote.balance.aye +
                          vote.balance.nay +
                          vote.balance.abstain);
                      const nayPercentage =
                        vote.balance.nay /
                        (vote.balance.aye +
                          vote.balance.nay +
                          vote.balance.abstain);
                      const abstainPercentage =
                        vote.balance.nay /
                        (vote.balance.aye +
                          vote.balance.nay +
                          vote.balance.abstain);
                      balance = {
                        aye: Number(delegation.balance) * ayePercentage,
                        nay: Number(delegation.balance) * nayPercentage,
                        abstain: Number(delegation.balance) * abstainPercentage,
                      };
                      break;
                  }

                  const delegatedVote: ConvictionVote = {
                    // The particular governance track
                    track: vote.track,
                    // The account that is voting
                    address: delegation.address,
                    // The index of the referendum
                    referendumIndex: vote.referendumIndex,
                    // The conviction being voted with, ie `None`, `Locked1x`, `Locked5x`, etc
                    conviction: delegation.conviction,
                    // The balance they are voting with themselves, sans delegated balance
                    balance: balance,
                    // The total amount of tokens that were delegated to them (including conviction)
                    delegatedConvictionBalance:
                      delegation.delegatedConvictionBalance,
                    // the total amount of tokens that were delegated to them (without conviction)
                    delegatedBalance: delegation.delegatedBalance,
                    // The vote type, either 'aye', or 'nay'
                    voteDirection: vote.voteDirection,
                    // Whether the person is voting themselves or delegating
                    voteType: "Delegating",
                    voteDirectionType: voteDirectionType,
                    // Who the person is delegating to
                    delegatedTo: vote.address,
                  };
                  finishedVotes.push(delegatedVote);
                }
              } else {
                // The person they are delegating to does not have any votes.
              }
            } else if (d.length == 1) {
              // There is a delegated delegation
              delegatedVote = d[0];
            }
          }
        }
      }
    }

    const convictionVoting = {
      finishedVotes: finishedVotes,
      ongoingVotes: ongoingVotes,
      delegations: allDelegations,
    };
    return convictionVoting;
  };

  getDelegators = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }

    const denom = await this.getDenom();
    const dem = await this.api.query.democracy.votingOf.entries();
    const delegators = (
      await Promise.all(
        dem.map(async ([key, value]) => {
          if (value.toHuman()["Delegating"]) {
            const address = key.toHuman()[0];
            const delegating = value.toJSON()["delegating"];
            const { balance, target, conviction, delegations, prior } =
              delegating;
            let effectiveBalance = 0;
            switch (conviction) {
              case "None":
                {
                  effectiveBalance = (balance / denom) * 0.1;
                }
                break;
              case "Locked1x":
                {
                  effectiveBalance = balance / denom;
                }
                break;
              case "Locked2x":
                {
                  effectiveBalance = (balance / denom) * 2;
                }
                break;
              case "Locked3x":
                {
                  effectiveBalance = (balance / denom) * 3;
                }
                break;
              case "Locked4x":
                {
                  effectiveBalance = (balance / denom) * 4;
                }
                break;
              case "Locked5x":
                {
                  effectiveBalance = (balance / denom) * 5;
                }
                break;
              case "Locked6x":
                {
                  effectiveBalance = (balance / denom) * 6;
                }
                break;
            }
            return {
              address: address,
              target: target,
              balance: balance / denom,
              effectiveBalance: effectiveBalance,
              conviction: conviction,
            };
          }
        })
      )
    ).filter((del) => {
      return del;
    });
    return delegators;
  };

  getFellowship = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const fellowship =
      await this.api.query.fellowshipCollective.members.entries();
    const fellowshipMap = fellowship.map((fellow) => {
      const [addr, r] = fellow;
      return {
        address: fellow[0].toHuman()[0],
        rank: r.toJSON()["rank"],
      };
    });
    return fellowshipMap;
  };

  getNominatorAddresses = async () => {
    if (!this.api.isConnected) {
      logger.warn(`{Chaindata::API::Warn} API is not connected, returning...`);
      return;
    }
    const nominators = await this.api.query.staking.nominators.entries();
    const nominatorMap = nominators.map((nominator) => {
      const [address, targets] = nominator;
      return address.toHuman().toString();
    });
    return nominatorMap;
  };
}

export default ChainData;
