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
import { Mock, vi } from "vitest";

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

    this.getChainType = vi.fn().mockResolvedValue(mergedValues.chainType);
    this.getDenom = vi.fn().mockResolvedValue(mergedValues.denom);
    // this.getApiAt = vi.fn().mockResolvedValue(mergedValues.getApiAt);
    this.getBlockHash = vi.fn().mockResolvedValue(mergedValues.blockHash);
    this.getLatestBlockHash = vi
      .fn()
      .mockResolvedValue(mergedValues.latestBlockHash);
    this.getBlock = vi.fn().mockResolvedValue(mergedValues.block);
    this.findEraBlockHash = vi
      .fn()
      .mockResolvedValue(mergedValues.findEraBlockHash);
    this.getLatestBlock = vi.fn().mockResolvedValue(mergedValues.latestBlock);
    this.getSession = vi.fn().mockResolvedValue(mergedValues.session);
    this.getSessionAtEra = vi.fn().mockResolvedValue(mergedValues.sessionAtEra);
    this.getActiveEraIndex = vi.fn().mockResolvedValue(mergedValues.activeEra);
    this.getCommission = vi.fn().mockResolvedValue(mergedValues.getCommission);
    this.getBlocked = vi.fn().mockResolvedValue(mergedValues.getBlocked);
    this.getBalance = vi.fn().mockResolvedValue(mergedValues.balance);
    this.getBondedAmount = vi
      .fn()
      .mockResolvedValue(mergedValues.getBondedAmount);
    this.getControllerFromStash = vi
      .fn()
      .mockResolvedValue(mergedValues.getControllerFromStash);
    this.getRewardDestination = vi
      .fn()
      .mockResolvedValue(mergedValues.getRewardDestination);
    this.getExposure = vi.fn().mockResolvedValue(mergedValues.exposure);
    this.getQueuedKeys = vi.fn().mockResolvedValue(mergedValues.queuedKeys);
    this.getNextKeys = vi.fn().mockResolvedValue(mergedValues.nextKeys);
    this.getCurrentEra = vi.fn().mockResolvedValue(mergedValues.currentEra);
    this.getIdentity = vi.fn().mockResolvedValue(mergedValues.identity);
    this.getNominators = vi.fn().mockResolvedValue(mergedValues.nominators);
    // this.getExposureAt = vi
    //   .fn()
    //   .mockResolvedValue(mergedValues.exposureAt);
    this.activeValidatorsInPeriod = vi
      .fn()
      .mockResolvedValue(mergedValues.activeValidatorsInPeriod);
    this.currentValidators = vi
      .fn()
      .mockResolvedValue(mergedValues.currentValidators);
    // this.getValidatorsAt = vi
    //   .fn()
    //   .mockResolvedValue(mergedValues.validatorsAt);
    this.getValidatorsAtEra = vi
      .fn()
      .mockResolvedValue(mergedValues.validatorsAtEra);
    this.getValidators = vi.fn().mockResolvedValue(mergedValues.validators);
    this.getTotalEraPoints = vi
      .fn()
      .mockResolvedValue(mergedValues.totalEraPoints);
    // this.getAssociatedValidatorAddresses = vi
    //   .fn()
    //   .mockResolvedValue(mergedValues.getAssociatedValidatorAddresses);
    this.hasIdentity = vi.fn().mockResolvedValue(mergedValues.hasIdentity);
    this.getIdentity = vi.fn().mockResolvedValue(mergedValues.getIdentity);
    this.getFormattedIdentity = vi
      .fn()
      .mockResolvedValue(mergedValues.identity);
    this.getProxyAnnouncements = vi
      .fn()
      .mockResolvedValue(mergedValues.proxyAnnouncements);
    this.getNominators(mergedValues.nominators);
  }

  getChainType: Mock;
  getDenom: Mock;
  // getApiAt: Mock;
  getBlockHash: Mock;
  getLatestBlockHash: Mock;
  getBlock: Mock;
  findEraBlockHash: Mock;
  getLatestBlock: Mock;
  getSession: Mock;
  getSessionAtEra: Mock;
  getActiveEraIndex: Mock;
  getCommission: Mock;
  getBlocked: Mock;
  getBalance: Mock;
  getBondedAmount: Mock;
  getControllerFromStash: Mock;
  getRewardDestination: Mock;
  getExposure: Mock;
  getQueuedKeys: Mock;
  getNextKeys: Mock;
  getCurrentEra: Mock;
  getIdentity: Mock;
  getNominators: Mock;
  // getExposureAt: Mock;
  activeValidatorsInPeriod: Mock;
  currentValidators: Mock;
  // getValidatorsAt: Mock;
  getValidatorsAtEra: Mock;
  getValidators: Mock;
  getTotalEraPoints: Mock;
  // getAssociatedValidatorAddresses: Mock;
  getProxyAnnouncements: Mock;
  hasIdentity: Mock;
  getFormattedIdentity: Mock;
  // getNominatorAddresses: Mock;
}
