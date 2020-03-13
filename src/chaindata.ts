import { ApiPromise } from '@polkadot/api';

import { BooleanResult, NumberResult } from './types';

class ChainData {
  public api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  getActiveEraIndex = async (): Promise<number> => {
    const activeEra = await this.api.query.staking.activeEra();
    return activeEra.unwrap().index.toNumber();
  }

  getCommission = async (eraIndex: number, validator: string): Promise<NumberResult> => {
    const prefs = await this.api.query.staking.erasValidatorPrefs(eraIndex, validator);
    if (prefs.isEmpty) {
      return [null, `Preferences is empty. Are you sure ${validator} is a validator?`];
    } else {
      return [prefs.commission.toNumber(), null];
    }
  }

  getOwnExposure = async (eraIndex: number, validator: string): Promise<NumberResult> => {
    const exposure = await this.api.query.staking.erasStakers(eraIndex, validator);
    if (exposure.isEmpty) {
      return [null, `Exposure is empty. Are you sure ${validator} is a validator?`];
    } else {
      return [exposure.own.toNumber(), null];
    }
  }

  hasUnappliedSlashes = async (startEraIndex: number, endEraIndex: number, validator: string): Promise<BooleanResult> => {
    const earliestEraIndex = await (await this.api.query.staking.earliestUnappliedSlash()).unwrap().toNumber();
    if (startEraIndex < earliestEraIndex) {
      return [null, `Start era is too early to query unapplied slashes.`];
    }

    let slashes = [];
    let curIndex = startEraIndex;
    while (curIndex <= endEraIndex) {
      const unappliedSlashes = await this.api.query.staking.unappliedSlashes(curIndex);
      //@ts-ignore
      for (const unappliedSlash of unappliedSlashes.toJSON()) {
        //@ts-ignore
        if (validator === unappliedSlash.validator) {
          slashes.push(unappliedSlash);
        }
      }
      curIndex++;
    }

    if (slashes.length) {
      return [true, null];
    } else {
      return [false,null];
    }
  }
}

export default ChainData;
