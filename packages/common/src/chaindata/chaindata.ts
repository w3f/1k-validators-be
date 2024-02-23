import { ApiPromise } from "@polkadot/api";
import ApiHandler from "../ApiHandler";
import logger from "../logger";
import { NumberResult, StringResult } from "../types";
import { sleep } from "../utils/util";
import {
  getApiAt,
  getApiAtBlockHash,
  getBlock,
  getBlockHash,
  getChainType,
  getDenom,
  getLatestBlock,
  getLatestBlockHash,
} from "./queries/ChainMeta";
import { getSession, getSessionAt, getSessionAtEra } from "./queries/Session";
import {
  findEraBlockHash,
  getActiveEraIndex,
  getCurrentEra,
  getEraAt,
  getErasMinStakeAt,
  getTotalEraPoints,
} from "./queries/Era";
import {
  getBalance,
  getBlocked,
  getBondedAmount,
  getCommission,
  getCommissionInEra,
  getControllerFromStash,
  getExposure,
  getExposureAt,
  getNextKeys,
  getQueuedKeys,
  getRewardDestination,
  getRewardDestinationAt,
} from "./queries/ValidatorPref";
import {
  currentValidators,
  getActiveValidatorsInPeriod,
  getAssociatedValidatorAddresses,
  getValidators,
  getValidatorsAt,
  getValidatorsAtEra,
} from "./queries/Validators";
import {
  getFormattedIdentity,
  getIdentity,
  hasIdentity,
} from "./queries/Identity";
import { getProxyAnnouncements } from "./queries/Proxy";
import { getNominatorAddresses, getNominators } from "./queries/Nomination";
import { CHAINDATA_RETRIES, CHAINDATA_SLEEP } from "../constants";

type JSON = any;

export const chaindataLabel = { label: "Chaindata" };

export class ChainData {
  public handler: ApiHandler;
  public api: ApiPromise;

  constructor(handler: ApiHandler) {
    this.api = handler.getApi();
  }

  checkApiConnection = async (retries = 0) => {
    if (!this.api?.isConnected) {
      logger.warn(`API is not connected, waiting...`, chaindataLabel);
      while (!this.api?.isConnected && retries < CHAINDATA_RETRIES) {
        logger.warn(
          `Retries: ${retries} - API is not connected, waiting...`,
          chaindataLabel,
        );
        await this.handler.healthCheck();
        await sleep(CHAINDATA_SLEEP);

        retries++;
      }
    }
  };

  getChainType = async (): Promise<string> => {
    return getChainType(this);
  };

  // Returns the denomination of the chain. Used for formatting planck denomianted amounts
  getDenom = async (): Promise<number> => {
    return await getDenom(this);
  };

  getApiAt = async (blockNumber: number): Promise<any> => {
    return await getApiAt(this, blockNumber);
  };

  getApiAtBlockHash = async (blockHash: string): Promise<any> => {
    return await getApiAtBlockHash(this, blockHash);
  };

  getBlockHash = async (blockNumber: number): Promise<string> => {
    return await getBlockHash(this, blockNumber);
  };

  getBlock = async (blockNumber): Promise<any> => {
    return await getBlock(this, blockNumber);
  };

  getLatestBlock = async () => {
    return await getLatestBlock(this);
  };

  getLatestBlockHash = async () => {
    return await getLatestBlockHash(this);
  };

  /**
   * Gets the current session
   * @returns session as number
   */
  getSession = async () => {
    return getSession(this);
  };
  getSessionAt = async (apiAt: ApiPromise) => {
    return getSessionAt(this, apiAt);
  };

  getSessionAtEra = async (era: number) => {
    return getSessionAtEra(this, era);
  };

  getEraAt = async (apiAt: ApiPromise) => {
    return await getEraAt(this, apiAt);
  };

  getTotalEraPoints = async (era: number) => {
    return await getTotalEraPoints(this, era);
  };

  getErasMinStakeAt = async (apiAt: any, era: number) => {
    return await getErasMinStakeAt(this, apiAt, era);
  };

  // Gets the active era index
  getActiveEraIndex = async (): Promise<NumberResult> => {
    return await getActiveEraIndex(this);
  };

  // Gets the curent era
  getCurrentEra = async () => {
    return getCurrentEra(this);
  };

  /**
   * Finds the block hash for a particular era index. Used to determine the
   * active validators within an era in `getActiveValidators`.
   *
   * @param chainType: either 'Polkadot', 'Kusama', or 'Local Testnet'
   */
  findEraBlockHash = async (
    era: number,
    chainType: string,
  ): Promise<StringResult> => {
    return await findEraBlockHash(this, era, chainType);
  };

  // Gets the commision for a given validator
  getCommission = async (validator: string): Promise<NumberResult> => {
    return await getCommission(this, validator);
  };

  // Gets the validator preferences, and whether or not they block external nominations
  getBlocked = async (validator: string): Promise<any> => {
    return await getBlocked(this, validator);
  };

  getCommissionInEra = async (
    apiAt: any,
    eraIndex: number,
    validator: string,
  ): Promise<NumberResult> => {
    return await getCommissionInEra(this, apiAt, eraIndex, validator);
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
    return await getBondedAmount(this, stash);
  };

  getControllerFromStash = async (stash: string): Promise<string | null> => {
    return await getControllerFromStash(this, stash);
  };

  getRewardDestination = async (stash: string): Promise<string | null> => {
    return await getRewardDestination(this, stash);
  };

  getRewardDestinationAt = async (
    apiAt: any,
    stash: string,
  ): Promise<string | null> => {
    return await getRewardDestinationAt(this, apiAt, stash);
  };

  getQueuedKeys = async (): Promise<any> => {
    return await getQueuedKeys(this);
  };

  getNextKeys = async (stash: string): Promise<any> => {
    return await getNextKeys(this, stash);
  };

  getBalance = async (address: string) => {
    return await getBalance(this, address);
  };

  getExposure = async (eraIndex: number, validator: string): Promise<any> => {
    return await getExposure(this, eraIndex, validator);
  };

  getExposureAt = async (
    apiAt: any,
    eraIndex: number,
    validator: string,
  ): Promise<any> => {
    return await getExposureAt(this, apiAt, eraIndex, validator);
  };

  activeValidatorsInPeriod = async (
    startEra: number,
    endEra: number,
    chainType: string,
  ): Promise<[string[] | null, string | null]> => {
    return await getActiveValidatorsInPeriod(this, startEra, endEra, chainType);
  };

  currentValidators = async (): Promise<any> => {
    return await currentValidators(this);
  };

  getValidatorsAt = async (apiAt: ApiPromise): Promise<any> => {
    return await getValidatorsAt(this, apiAt);
  };

  getValidatorsAtEra = async (era: number) => {
    return await getValidatorsAtEra(this, era);
  };

  /**
   * Gets list of validators that have `validate` intentions
   * @returns list of all validators
   */
  getValidators = async () => {
    return await getValidators(this);
  };

  getAssociatedValidatorAddresses = async () => {
    return await getAssociatedValidatorAddresses(this);
  };

  /**
   * Checks if an account has an identity set.
   * @param account The account to check.
   * @returns [hasIdentity, verified]
   */
  hasIdentity = async (account: string): Promise<[boolean, boolean]> => {
    return await hasIdentity(this, account);
  };

  /**
   * Gets the identity root for an account.
   * @param account The account to check.
   * @returns The identity root string.
   */
  getIdentity = async (account: string): Promise<string | null> => {
    return await getIdentity(this, account);
  };

  getFormattedIdentity = async (addr) => {
    return await getFormattedIdentity(this, addr);
  };

  getProxyAnnouncements = async (address: string) => {
    return await getProxyAnnouncements(this, address);
  };

  getNominatorAddresses = async () => {
    return await getNominatorAddresses(this);
  };

  getNominators = async (): Promise<any> => {
    return await getNominators(this);
  };
}

export default ChainData;
