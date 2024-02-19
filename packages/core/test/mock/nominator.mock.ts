import { ApiHandler, Types } from "@1kv/common";
import Keyring from "@polkadot/keyring";
import { KeyringPair } from "@polkadot/keyring/types";

type Stash = string; // Simplified for example purposes

const Constants = {
  TIME_DELAY_BLOCKS: 10800, // Example value
};

const label = { label: "MockNominator" };

// Mock class
class NominatorMock {
  public currentlyNominating: Types.Stash[] = [];

  private _bondedAddress: string;
  private bot: any;
  private handler: ApiHandler;
  private signer: KeyringPair;

  // Use proxy of controller instead of controller directly.
  private _isProxy: boolean;

  // The amount of blocks for a time delay proxy
  private _proxyDelay: number;

  // The ideal average amount of stake the account can nominate per validator
  private _avgStake = 0;
  // The target amount of how much funds should be bonded so they can all be optimally used
  private _targetBond = 0;
  // The target number of validators to nominate
  private _nominationNum = 0;

  constructor(
    handler: ApiHandler,
    cfg: Types.NominatorConfig,
    networkPrefix = 2,
    bot: any,
  ) {
    this.handler = handler;
    this.bot = bot;
    this._isProxy = cfg.isProxy || false;

    // If the proxyDelay is not set in the config, default to TIME_DELAY_BLOCKS (~18 hours, 10800 blocks)
    this._proxyDelay =
      cfg.proxyDelay == 0 ? cfg.proxyDelay : Constants.TIME_DELAY_BLOCKS;

    const keyring = new Keyring({ type: "ed25519", ss58Format: 2 });
    const pair = keyring.addFromUri(
      cfg.seed,
      { name: "first pair" },
      "ed25519",
    );

    this.signer = pair;
    this._bondedAddress =
      (this._isProxy ? cfg?.proxyFor : this.signer?.address) || "mockedAddress";
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

  // Public methods
  async stash(): Promise<string> {
    return this.bondedAddress;
  }

  async payee(): Promise<string> {
    return this.bondedAddress;
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
  async sendStakingTx(tx: any, targets: string[]): Promise<boolean> {
    return true;
  }
}

export default NominatorMock;
