import { ApiPromise } from "@polkadot/api";
import ApiHandler from "../ApiHandler/ApiHandler";
import logger from "../logger";
import { NumberResult } from "../types";
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
  EraPointsInfo,
  findEraBlockHash,
  getActiveEraIndex,
  getCurrentEra,
  getEraAt,
  getErasMinStakeAt,
  getTotalEraPoints,
} from "./queries/Era";
import {
  Balance,
  Exposure,
  getBalance,
  getBlocked,
  getBondedAmount,
  getCommission,
  getCommissionInEra,
  getControllerFromStash,
  getDenomBondedAmount,
  getExposure,
  getExposureAt,
  getNextKeys,
  getQueuedKeys,
  getRewardDestination,
  getRewardDestinationAt,
  isBonded,
  NextKeys,
  QueuedKey,
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
import { getProxyAnnouncements, ProxyAnnouncement } from "./queries/Proxy";
import {
  getNominatorAddresses,
  getNominatorCurrentTargets,
  getNominatorLastNominationEra,
  getNominators,
  NominatorInfo,
} from "./queries/Nomination";
import { CHAINDATA_RETRIES } from "../constants";
import { Identity } from "../db";
import { Block } from "@polkadot/types/interfaces";
import { ApiDecoration } from "@polkadot/api/types";

type JSON = any;

export const chaindataLabel = { label: "Chaindata" };

export class ChainData {
  public handler: ApiHandler;
  public api: ApiPromise | null;

  constructor(handler: ApiHandler) {
    this.handler = handler;
    this.api = handler.getApi();
  }

  checkApiConnection = async (retries = 0): Promise<boolean> => {
    if (!this.handler.getApi()?.isConnected) {
      if (retries < CHAINDATA_RETRIES) {
        retries++;
        return await this.checkApiConnection(retries);
      } else {
        logger.warn(`Performing health check on api...`, chaindataLabel);
        await this.handler.getApi()?.disconnect();
        const healthy = await this.handler.healthCheck();
        if (healthy) {
          this.api = this.handler.getApi();
          return true;
        }
      }
    } else {
      return true; // API is connected
    }

    return false; // Exceeded retries without connecting
  };

  getChainType = async (): Promise<string | null> => {
    return getChainType(this);
  };

  // Returns the denomination of the chain. Used for formatting planck denomianted amounts
  getDenom = async (): Promise<number | null> => {
    return await getDenom(this);
  };

  getApiAt = async (
    blockNumber: number,
  ): Promise<ApiDecoration<"promise"> | null> => {
    return await getApiAt(this, blockNumber);
  };

  getApiAtBlockHash = async (
    blockHash: string,
  ): Promise<ApiDecoration<"promise"> | null> => {
    return await getApiAtBlockHash(this, blockHash);
  };

  getBlockHash = async (blockNumber: number): Promise<string | null> => {
    return await getBlockHash(this, blockNumber);
  };

  getBlock = async (blockNumber: number): Promise<Block | null> => {
    return await getBlock(this, blockNumber);
  };

  getLatestBlock = async (): Promise<number | null> => {
    return await getLatestBlock(this);
  };

  getLatestBlockHash = async (): Promise<string | null> => {
    return await getLatestBlockHash(this);
  };

  /**
   * Gets the current session
   * @returns session as number
   */
  getSession = async (): Promise<number | null> => {
    return getSession(this);
  };
  getSessionAt = async (
    apiAt: ApiDecoration<"promise">,
  ): Promise<number | null> => {
    return getSessionAt(this, apiAt);
  };

  getSessionAtEra = async (era: number): Promise<number | null> => {
    return getSessionAtEra(this, era);
  };

  getEraAt = async (
    apiAt: ApiDecoration<"promise">,
  ): Promise<number | null> => {
    return await getEraAt(this, apiAt);
  };

  getTotalEraPoints = async (era: number): Promise<EraPointsInfo | null> => {
    return await getTotalEraPoints(this, era);
  };

  getErasMinStakeAt = async (
    apiAt: any,
    era: number,
  ): Promise<number | null> => {
    return await getErasMinStakeAt(this, apiAt, era);
  };

  // Gets the active era index
  getActiveEraIndex = async (): Promise<NumberResult> => {
    return await getActiveEraIndex(this);
  };

  // Gets the curent era
  getCurrentEra = async (): Promise<number | null> => {
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
  ): Promise<[string | null, string | null]> => {
    return await findEraBlockHash(this, era, chainType);
  };

  // Gets the commision for a given validator
  getCommission = async (validator: string): Promise<NumberResult> => {
    return await getCommission(this, validator);
  };

  // Gets the validator preferences, and whether or not they block external nominations
  getBlocked = async (validator: string): Promise<boolean> => {
    return await getBlocked(this, validator);
  };

  getCommissionInEra = async (
    apiAt: any,
    eraIndex: number,
    validator: string,
  ): Promise<number | null> => {
    return await getCommissionInEra(this, apiAt, eraIndex, validator);
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
    return await getBondedAmount(this, stash);
  };

  // TODO: add tests
  isBonded = async (bondedAddress: string): Promise<boolean> => {
    return await isBonded(this, bondedAddress);
  };

  // TODO: Add tests
  getDenomBondedAmount = async (stash: string): Promise<NumberResult> => {
    return await getDenomBondedAmount(this, stash);
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

  getQueuedKeys = async (): Promise<QueuedKey[]> => {
    return await getQueuedKeys(this);
  };

  getNextKeys = async (stash: string): Promise<NextKeys | null> => {
    return await getNextKeys(this, stash);
  };

  getBalance = async (address: string): Promise<Balance | null> => {
    return await getBalance(this, address);
  };

  getExposure = async (
    eraIndex: number,
    validator: string,
  ): Promise<Exposure | null> => {
    return await getExposure(this, eraIndex, validator);
  };

  getExposureAt = async (
    apiAt: any,
    eraIndex: number,
    validator: string,
  ): Promise<Exposure | null> => {
    return await getExposureAt(this, apiAt, eraIndex, validator);
  };

  activeValidatorsInPeriod = async (
    startEra: number,
    endEra: number,
    chainType: string,
  ): Promise<[string[] | null, string | null]> => {
    return await getActiveValidatorsInPeriod(this, startEra, endEra, chainType);
  };

  currentValidators = async (): Promise<string[]> => {
    return await currentValidators(this);
  };

  getValidatorsAt = async (
    apiAt: ApiDecoration<"promise">,
  ): Promise<string[]> => {
    return await getValidatorsAt(this, apiAt);
  };

  getValidatorsAtEra = async (era: number): Promise<string[]> => {
    return await getValidatorsAtEra(this, era);
  };

  /**
   * Gets list of validators that have `validate` intentions
   * @returns list of all validators
   */
  getValidators = async (): Promise<string[]> => {
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

  getFormattedIdentity = async (addr: string): Promise<Identity | null> => {
    return await getFormattedIdentity(this, addr);
  };

  getProxyAnnouncements = async (
    address: string,
  ): Promise<ProxyAnnouncement[]> => {
    return await getProxyAnnouncements(this, address);
  };

  getNominatorAddresses = async () => {
    return await getNominatorAddresses(this);
  };

  getNominators = async (): Promise<NominatorInfo[]> => {
    return await getNominators(this);
  };

  // TODO: add tests
  getNominatorLastNominationEra = async (
    nominator: string,
  ): Promise<number | null> => {
    return await getNominatorLastNominationEra(this, nominator);
  };

  // TODO: add tests
  getNominatorCurrentTargets = async (
    nominator: string,
  ): Promise<string[] | null> => {
    return await getNominatorCurrentTargets(this, nominator);
  };
}

export default ChainData;
