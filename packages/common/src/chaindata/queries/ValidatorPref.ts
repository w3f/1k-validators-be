import { NumberResult } from "../../types";
import ChainData, {
  chaindataLabel,
  handleError,
  HandlerType,
} from "../chaindata";
import logger from "../../logger";
import { ApiDecoration } from "@polkadot/api/types";

export const getCommission = async (
  chaindata: ChainData,
  validator: string,
): Promise<NumberResult> => {
  try {
    const api = await chaindata.handler.getApi();
    const prefs = await api.query.staking.validators(validator);
    if (!prefs) {
      return [0, "No preferences found."];
    }
    return [prefs.commission.toNumber(), null];
  } catch (e) {
    await handleError(chaindata, e, "getCommission", HandlerType.RelayHandler);
    return [0, JSON.stringify(e)];
  }
};

export const getCommissionInEra = async (
  chaindata: ChainData,
  apiAt: ApiDecoration<"promise">,
  eraIndex: number,
  validator: string,
): Promise<number | null> => {
  try {
    const prefs = await apiAt?.query?.staking.erasValidatorPrefs(
      eraIndex,
      validator,
    );
    return prefs?.commission?.toNumber();
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getCommissionInEra",
      HandlerType.RelayHandler,
    );
    return null;
  }
};

export const getBlocked = async (
  chaindata: ChainData,
  validator: string,
): Promise<boolean> => {
  try {
    const api = await chaindata.handler.getApi();
    const rawPrefs = await api.query.staking.validators(validator);
    return rawPrefs?.blocked?.toString() === "true";
  } catch (e) {
    await handleError(chaindata, e, "getBlocked", HandlerType.RelayHandler);
    return false;
  }
};

// TODO: add tests
// bondedAddress - formerly controller
export const isBonded = async (
  chaindata: ChainData,
  stash: string,
): Promise<boolean> => {
  try {
    const api = await chaindata.handler.getApi();
    const bonded = await api.query.staking.bonded(stash);
    if (bonded) {
      return bonded.isSome;
    } else {
      return false;
    }
  } catch (e) {
    await handleError(chaindata, e, "isBonded", HandlerType.RelayHandler);
    return false;
  }
};

// TODO: Add tests
export const getDenomBondedAmount = async (
  chaindata: ChainData,
  stash: string,
): Promise<NumberResult> => {
  try {
    const api = await chaindata.handler.getApi();
    const bondedAddress = await api.query.staking.bonded(stash);
    if (!bondedAddress || bondedAddress.isNone) {
      return [0, "Not bonded to any account."];
    }

    const ledger: any = await api.query.staking.ledger(
      bondedAddress.toString(),
    );
    if (!ledger || ledger.isNone) {
      return [0, `Ledger is empty.`];
    }
    const denom = await chaindata.getDenom();
    if (denom) {
      const denomBondedAmount = Number(ledger.toJSON().active) / denom;

      return [denomBondedAmount, null];
    } else {
      return [0, null];
    }
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getDenomBondedAmount",
      HandlerType.RelayHandler,
    );
    return [0, JSON.stringify(e)];
  }
};

export const getBondedAmount = async (
  chaindata: ChainData,
  stash: string,
): Promise<NumberResult> => {
  try {
    const api = await chaindata.handler.getApi();
    const bondedAddress = await api.query.staking.bonded(stash);
    if (!bondedAddress || bondedAddress.isNone) {
      return [0, "Not bonded to any account."];
    }

    const ledger: any = await api.query.staking.ledger(
      bondedAddress.toString(),
    );
    if (!ledger || ledger.isNone) {
      return [0, `Ledger is empty.`];
    }

    return [ledger.toJSON().active, null];
  } catch (e) {
    logger.error(`Error getting bonded amount: ${e}`, chaindataLabel);
    return [0, JSON.stringify(e)];
  }
};

export const getControllerFromStash = async (
  chaindata: ChainData,
  stash: string,
): Promise<string | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const controller = await api.query.staking.bonded(stash);
    if (!controller) {
      return null;
    }
    return controller.toString();
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getControllerFromStash",
      HandlerType.RelayHandler,
    );
    return null;
  }
};

export const getRewardDestination = async (
  chaindata: ChainData,
  stash: string,
): Promise<string | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const rewardDestination: any = await api.query.staking.payee(stash);
    if (rewardDestination?.toJSON()?.account) {
      return rewardDestination?.toJSON()?.account;
    } else {
      return rewardDestination?.toString();
    }
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getRewardDestination",
      HandlerType.RelayHandler,
    );
    return null;
  }
};

export const getRewardDestinationAt = async (
  chaindata: ChainData,
  apiAt: any,
  stash: string,
): Promise<string | null> => {
  try {
    const rewardDestination: any = await apiAt.query.staking.payee(stash);
    if (rewardDestination.toJSON().account) {
      return rewardDestination.toJSON().account;
    } else {
      return rewardDestination.toString();
    }
  } catch (e) {
    logger.error(`Error getting reward destination: ${e}`, chaindataLabel);
    return null;
  }
};

export interface QueuedKey {
  address: string;
  keys: string; // Hex representation of the keys
}

export const getQueuedKeys = async (
  chaindata: ChainData,
): Promise<QueuedKey[]> => {
  try {
    const api = await chaindata.handler.getApi();
    const queuedKeys = await api.query.session.queuedKeys();
    if (!queuedKeys) {
      return [];
    }
    const keys = queuedKeys.map(([validator, keys]) => {
      return {
        address: validator.toString(),
        keys: keys.toHex(),
      };
    });
    return keys;
  } catch (e) {
    await handleError(chaindata, e, "getQueuedKeys", HandlerType.RelayHandler);
    return [];
  }
};

export interface NextKeys {
  keys: {
    grandpa: string;
    babe: string;
    imOnline: string;
    paraValidator: string;
    paraAssignment: string;
    authorityDiscovery: string;
    beefy: string;
  };
}

export const getNextKeys = async (
  chaindata: ChainData,
  stash: string,
): Promise<NextKeys | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const nextKeysRaw = await api.query.session.nextKeys(stash);
    if (!nextKeysRaw) {
      return null;
    }
    const nextKeysData = nextKeysRaw.toJSON();

    if (nextKeysData && typeof nextKeysData === "object") {
      // Check if the object is not empty
      if (Object.keys(nextKeysData).length > 0) {
        return { keys: nextKeysData } as NextKeys;
      } else {
        return null;
      }
    }
  } catch (e) {
    await handleError(chaindata, e, "getNextKeys", HandlerType.RelayHandler);
  }
  return null;
};

export interface Balance {
  free: string;
}

export const getBalance = async (
  chaindata: ChainData,
  address: string,
): Promise<Balance | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const accountData = await api.query.system.account(address);
    if (!accountData) {
      return null;
    }
    const balance: Balance = {
      free: accountData?.data?.free?.toString(),
    };
    return balance;
  } catch (e) {
    logger.error(`Error getting balance: ${e}`, chaindataLabel);
    return null;
  }
};

export interface Stake {
  address: string;
  bonded: number;
}

export interface Exposure {
  total: number;
  own: number;
  others: Stake[];
}

export const getExposure = async (
  chaindata: ChainData,
  eraIndex: number,
  validator: string,
): Promise<Exposure | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const denom = await chaindata.getDenom();
    const eraStakers = await api.query.staking.erasStakers(eraIndex, validator);
    if (eraStakers && denom) {
      const total = parseFloat(eraStakers.total.toString()) / denom;
      const own = parseFloat(eraStakers.own.toString()) / denom;

      const activeExposure: Stake[] = eraStakers.others.map(
        (stake: {
          who: { toString: () => string };
          value: { toString: () => string };
        }) => ({
          address: stake.who.toString(),
          bonded: parseFloat(stake.value.toString()) / denom,
        }),
      );

      return {
        total,
        own,
        others: activeExposure,
      };
    }

    return null;
  } catch (e) {
    await handleError(chaindata, e, "getExposure", HandlerType.RelayHandler);
    return null;
  }
};

export const getExposureAt = async (
  chaindata: ChainData,
  apiAt: any,
  eraIndex: number,
  validator: string,
): Promise<Exposure | null> => {
  try {
    const denom = await chaindata.getDenom();
    const eraStakers = await apiAt.query.staking.erasStakers(
      eraIndex,
      validator,
    );
    if (eraStakers && denom) {
      const total = parseFloat(eraStakers.total.toString()) / denom;
      const own = parseFloat(eraStakers.own.toString()) / denom;
      // @ts-ignore
      const activeExposure = eraStakers.others.toJSON().map((stake) => {
        return {
          address: stake.who.toString(),
          bonded: stake.value / denom,
        };
      });
      return {
        total: total,
        own: own,
        others: activeExposure,
      };
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getExposureAt", HandlerType.RelayHandler);
    return null;
  }
};
