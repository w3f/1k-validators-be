import ApiHandler from "./ApiHandler";

import { KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS, POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS, TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS } from "./constants";
import logger from "./logger";
import { BooleanResult, NumberResult, StringResult } from "./types";

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
  findEraBlockHash = async (era: number, chainType: string): Promise<StringResult> => {
    const eraBlockLength = 
      chainType == 'Kusama' 
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == 'Polkadot'
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
        testBlockNumber =
          testBlockNumber - eraBlockLength / 3;
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

  getStashFromController = async (controller:string): Promise<string | null> => {
    const api = await this.handler.getApi();

    const ledger: JSON = await api.query.staking.ledger(controller);
    if (ledger.isNone) {
      return null;
    }

    return ledger.toJSON().stash;
  }
}

export default ChainData;
