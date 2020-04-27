import { ApiPromise } from "@polkadot/api";

import logger from "./logger";
import { BooleanResult, NumberResult } from "./types";

type JSON = any;

class ChainData {
  public api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  getActiveEraIndex = async (): Promise<NumberResult> => {
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

  getCommission = async (validator: string): Promise<NumberResult> => {
    const prefs = await this.api.query.staking.validators(validator);
    return [prefs.commission.toNumber(), null];
  };

  getCommissionInEra = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
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

  getBalanceOf = async (validator: string): Promise<NumberResult> => {
    const account = await this.api.query.system.account(validator);
    return [account.data.free.toNumber(), null];
  };

  getBondedAmount = async (stash: string): Promise<NumberResult> => {
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
    console.log("ledger", ledger.toString());

    return [ledger.toJSON().active, null];
  };

  getOwnExposure = async (
    eraIndex: number,
    validator: string
  ): Promise<NumberResult> => {
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
    const earliestUnapplied = await this.api.query.staking.earliestUnappliedSlash();
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
}

export default ChainData;
