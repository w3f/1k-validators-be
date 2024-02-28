import { Block } from "@polkadot/types/interfaces";

import fs from "fs";
import path from "path";

import { EraPointsInfo } from "../queries/Era";
import {
  Balance,
  Exposure,
  NextKeys,
  QueuedKey,
} from "../queries/ValidatorPref";
import { ProxyAnnouncement } from "../queries/Proxy";
import { NominatorInfo } from "../queries/Nomination";
import { Types } from "../../index";

export interface ChaindataValues {
  chainType: string;
  denom: number;
  latestBlock: number;
  blockHash: string;
  block: Block | undefined;
  latestBlockHash: string;
  session: number;
  activeEra: Types.NumberResult;
  currentEra: number;
  sessionAtEra: any;
  totalEraPoints: EraPointsInfo;
  findEraBlockHash: Types.StringResult;
  currentValidators: string[];
  getCommission: Types.NumberResult;
  getBlocked: boolean;
  getBondedAmount: Types.NumberResult;
  getControllerFromStash: string;
  getRewardDestination: string;
  queuedKeys: QueuedKey[];
  nextKeys: NextKeys | undefined;
  balance: Balance;
  exposure: Exposure;
  activeValidatorsInPeriod: [string[] | null, string | null];
  validatorsAtEra: string[];
  validators: string[];
  hasIdentity: [boolean, boolean];
  getIdentity: string | null;
  identity: Types.Identity;
  proxyAnnouncements: ProxyAnnouncement[];
  nominators: NominatorInfo[];
}
export class ChainData {
  private defaultValues: Partial<ChaindataValues> = {};

  private loadMockValuesFromJson(jsonPath: string): void {
    try {
      // Read the JSON file
      const jsonPath = path.resolve(
        __dirname,
        "../../../data/chaindata/kusamaMockValues.json",
      );
      const jsonData = fs.readFileSync(jsonPath, "utf-8");

      this.defaultValues = JSON.parse(jsonData);
    } catch (error) {
      console.error("Error loading mock values from JSON:", error);
    }
  }
  constructor(mockValues: Partial<ChaindataValues> = {}) {
    // Load mock values from JSON file
    this.loadMockValuesFromJson("../../data/chaindata/kusamaMockValues.json");

    // Merge default and provided mock values
    const mergedValues: Partial<ChaindataValues> = {
      ...this.defaultValues,
      ...mockValues,
    };

    this.getChainType = jest.fn().mockResolvedValue(mergedValues.chainType);
    this.getDenom = jest.fn().mockResolvedValue(mergedValues.denom);
    // this.getApiAt = jest.fn().mockResolvedValue(mergedValues.getApiAt);
    this.getBlockHash = jest.fn().mockResolvedValue(mergedValues.blockHash);
    this.getLatestBlockHash = jest
      .fn()
      .mockResolvedValue(mergedValues.latestBlockHash);
    this.getBlock = jest.fn().mockResolvedValue(mergedValues.block);
    this.findEraBlockHash = jest
      .fn()
      .mockResolvedValue(mergedValues.findEraBlockHash);
    this.getLatestBlock = jest.fn().mockResolvedValue(mergedValues.latestBlock);
    this.getSession = jest.fn().mockResolvedValue(mergedValues.session);
    this.getSessionAtEra = jest
      .fn()
      .mockResolvedValue(mergedValues.sessionAtEra);
    this.getActiveEraIndex = jest
      .fn()
      .mockResolvedValue(mergedValues.activeEra);
    this.getCommission = jest
      .fn()
      .mockResolvedValue(mergedValues.getCommission);
    this.getBlocked = jest.fn().mockResolvedValue(mergedValues.getBlocked);
    this.getBalance = jest.fn().mockResolvedValue(mergedValues.balance);
    this.getBondedAmount = jest
      .fn()
      .mockResolvedValue(mergedValues.getBondedAmount);
    this.getControllerFromStash = jest
      .fn()
      .mockResolvedValue(mergedValues.getControllerFromStash);
    this.getRewardDestination = jest
      .fn()
      .mockResolvedValue(mergedValues.getRewardDestination);
    this.getExposure = jest.fn().mockResolvedValue(mergedValues.exposure);
    this.getQueuedKeys = jest.fn().mockResolvedValue(mergedValues.queuedKeys);
    this.getNextKeys = jest.fn().mockResolvedValue(mergedValues.nextKeys);
    this.getCurrentEra = jest.fn().mockResolvedValue(mergedValues.currentEra);
    this.getIdentity = jest.fn().mockResolvedValue(mergedValues.identity);
    this.getNominators = jest.fn().mockResolvedValue(mergedValues.nominators);
    // this.getExposureAt = jest
    //   .fn()
    //   .mockResolvedValue(mergedValues.exposureAt);
    this.activeValidatorsInPeriod = jest
      .fn()
      .mockResolvedValue(mergedValues.activeValidatorsInPeriod);
    this.currentValidators = jest
      .fn()
      .mockResolvedValue(mergedValues.currentValidators);
    // this.getValidatorsAt = jest
    //   .fn()
    //   .mockResolvedValue(mergedValues.validatorsAt);
    this.getValidatorsAtEra = jest
      .fn()
      .mockResolvedValue(mergedValues.validatorsAtEra);
    this.getValidators = jest.fn().mockResolvedValue(mergedValues.validators);
    this.getTotalEraPoints = jest
      .fn()
      .mockResolvedValue(mergedValues.totalEraPoints);
    // this.getAssociatedValidatorAddresses = jest
    //   .fn()
    //   .mockResolvedValue(mergedValues.getAssociatedValidatorAddresses);
    this.hasIdentity = jest.fn().mockResolvedValue(mergedValues.hasIdentity);
    this.getIdentity = jest.fn().mockResolvedValue(mergedValues.getIdentity);
    this.getFormattedIdentity = jest
      .fn()
      .mockResolvedValue(mergedValues.identity);
    this.getProxyAnnouncements = jest
      .fn()
      .mockResolvedValue(mergedValues.proxyAnnouncements);
    this.getNominators(mergedValues.nominators);
  }

  getChainType: jest.Mock;
  getDenom: jest.Mock;
  // getApiAt: jest.Mock;
  getBlockHash: jest.Mock;
  getLatestBlockHash: jest.Mock;
  getBlock: jest.Mock;
  findEraBlockHash: jest.Mock;
  getLatestBlock: jest.Mock;
  getSession: jest.Mock;
  getSessionAtEra: jest.Mock;
  getActiveEraIndex: jest.Mock;
  getCommission: jest.Mock;
  getBlocked: jest.Mock;
  getBalance: jest.Mock;
  getBondedAmount: jest.Mock;
  getControllerFromStash: jest.Mock;
  getRewardDestination: jest.Mock;
  getExposure: jest.Mock;
  getQueuedKeys: jest.Mock;
  getNextKeys: jest.Mock;
  getCurrentEra: jest.Mock;
  getIdentity: jest.Mock;
  getNominators: jest.Mock;
  // getExposureAt: jest.Mock;
  activeValidatorsInPeriod: jest.Mock;
  currentValidators: jest.Mock;
  // getValidatorsAt: jest.Mock;
  getValidatorsAtEra: jest.Mock;
  getValidators: jest.Mock;
  getTotalEraPoints: jest.Mock;
  // getAssociatedValidatorAddresses: jest.Mock;
  getProxyAnnouncements: jest.Mock;
  hasIdentity: jest.Mock;
  getFormattedIdentity: jest.Mock;
  // getNominatorAddresses: jest.Mock;
}
