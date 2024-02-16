import { ApiHandler } from "@1kv/common";

export interface NominatorConfig {
  isProxy?: boolean;
  proxyDelay?: number;
  proxyFor?: string;
  seed?: string;
}

type Stash = string; // Simplified for example purposes

const Constants = {
  TIME_DELAY_BLOCKS: 10800, // Example value
};

// Mock class
export class NominatorMock {
  private handler: ApiHandler;
  private bot: any;
  private _isProxy: boolean;
  private _proxyDelay: number;
  private _avgStake: number;
  private _targetBond: number;
  private _nominationNum: number;
  private _bondedAddress: string;

  public currentlyNominating: Stash[] = [];

  constructor(
    handler: ApiHandler,
    cfg: NominatorConfig,
    networkPrefix = 2,
    bot: any,
  ) {
    this.handler = handler;
    this.bot = bot;
    this._isProxy = cfg.isProxy || false;
    this._proxyDelay =
      cfg.proxyDelay !== undefined
        ? cfg.proxyDelay
        : Constants.TIME_DELAY_BLOCKS;
    this._avgStake = 0;
    this._targetBond = 0;
    this._nominationNum = 0;
    this._bondedAddress =
      this._isProxy && cfg.proxyFor ? cfg.proxyFor : "mockedBondedAddress";
  }

  // Getters and setters
  get address(): string {
    return this._isProxy ? "mockedProxyAddress" : this._bondedAddress;
  }

  get bondedAddress(): string {
    return this._bondedAddress;
  }

  get isProxy(): boolean {
    return this._isProxy;
  }

  get proxyDelay(): number {
    return this._proxyDelay;
  }

  get nominationNum(): number {
    return this._nominationNum;
  }

  set nominationNum(value: number) {
    this._nominationNum = value;
  }

  get targetBond(): number {
    return this._targetBond;
  }

  set targetBond(value: number) {
    this._targetBond = value;
  }

  get avgStake(): number {
    return this._avgStake;
  }

  set avgStake(value: number) {
    this._avgStake = value;
  }

  // Public methods
  async stash(): Promise<string> {
    return "mockedStash";
  }

  async payee(): Promise<string> {
    return "mockedPayee";
  }

  async nominate(targets: Stash[]): Promise<boolean> {
    this.currentlyNominating = targets;
    return true;
  }

  async cancelTx(announcement: {
    real: string;
    callHash: string;
    height: number;
  }): Promise<boolean> {
    return true;
  }
}

export default NominatorMock;
