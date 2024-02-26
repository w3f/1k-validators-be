import { NumberResult } from "../../types";
import ChainData, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getCommission = async (
  chaindata: ChainData,
  validator: string,
): Promise<NumberResult> => {
  try {
    await chaindata.checkApiConnection();
    const prefs = await chaindata.api.query.staking.validators(validator);
    return [prefs.commission.toNumber(), null];
  } catch (e) {
    logger.error(`Error getting commission: ${e}`, chaindataLabel);
  }
};

export const getCommissionInEra = async (
  chaindata: ChainData,
  apiAt: any,
  eraIndex: number,
  validator: string,
): Promise<NumberResult> => {
  try {
    await chaindata.checkApiConnection();
    const prefs = await apiAt.query.staking.erasValidatorPrefs(
      eraIndex,
      validator,
    );
    return prefs?.commission?.toNumber();
  } catch (e) {
    logger.error(`Error getting commission in era: ${e}`, chaindataLabel);
  }
};

export const getBlocked = async (
  chaindata: ChainData,
  validator: string,
): Promise<boolean> => {
  try {
    await chaindata.checkApiConnection();
    const prefs = (
      await chaindata.api.query.staking.validators(validator)
    )?.blocked.toString();
    return prefs == "true";
  } catch (e) {
    logger.error(`Error getting blocked: ${e}`, chaindataLabel);
  }
};

export const getBondedAmount = async (
  chaindata: ChainData,
  stash: string,
): Promise<NumberResult> => {
  try {
    await chaindata.checkApiConnection();
    const bondedAddress = await chaindata.api.query.staking.bonded(stash);
    if (bondedAddress.isNone) {
      return [null, "Not bonded to any account."];
    }

    const ledger: any = await chaindata.api.query.staking.ledger(
      bondedAddress.toString(),
    );
    if (ledger.isNone) {
      return [null, `Ledger is empty.`];
    }

    return [ledger.toJSON().active, null];
  } catch (e) {
    logger.error(`Error getting bonded amount: ${e}`, chaindataLabel);
  }
};

export const getControllerFromStash = async (
  chaindata: ChainData,
  stash: string,
): Promise<string> => {
  try {
    await chaindata.checkApiConnection();
    const controller = await chaindata.api.query.staking.bonded(stash);
    return controller.toString();
  } catch (e) {
    logger.error(`Error getting controller from stash: ${e}`, chaindataLabel);
  }
};

export const getRewardDestination = async (
  chaindata: ChainData,
  stash: string,
): Promise<string> => {
  try {
    await chaindata.checkApiConnection();
    const rewardDestination: any =
      await chaindata.api.query.staking.payee(stash);
    if (rewardDestination.toJSON().account) {
      return rewardDestination.toJSON().account;
    } else {
      return rewardDestination.toString();
    }
  } catch (e) {
    logger.error(`Error getting reward destination: ${e}`, chaindataLabel);
  }
};

export const getRewardDestinationAt = async (
  chaindata: ChainData,
  apiAt: any,
  stash: string,
): Promise<string> => {
  try {
    await chaindata.checkApiConnection();
    const rewardDestination: any = await apiAt.query.staking.payee(stash);
    if (rewardDestination.toJSON().account) {
      return rewardDestination.toJSON().account;
    } else {
      return rewardDestination.toString();
    }
  } catch (e) {
    logger.error(`Error getting reward destination: ${e}`, chaindataLabel);
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
    await chaindata.checkApiConnection();
    const queuedKeys = await chaindata.api.query.session.queuedKeys();
    const keys = queuedKeys.map(([validator, keys]) => {
      return {
        address: validator.toString(),
        keys: keys.toHex(),
      };
    });
    return keys;
  } catch (e) {
    logger.error(`Error getting queued keys: ${e}`, chaindataLabel);
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
): Promise<NextKeys | undefined> => {
  try {
    await chaindata.checkApiConnection();
    const nextKeysRaw = await chaindata.api.query.session.nextKeys(stash);
    const nextKeysData = nextKeysRaw.toJSON();

    if (
      nextKeysData &&
      typeof nextKeysData === "object" &&
      "keys" in nextKeysData
    ) {
      const keys = nextKeysData["keys"];
      if (keys && typeof keys === "object") {
        return { keys } as NextKeys;
      }
    }
  } catch (e) {
    logger.error(`Error getting next keys: ${e}`, chaindataLabel);
  }
  return undefined;
};

export interface Balance {
  free: string;
}

export const getBalance = async (
  chaindata: ChainData,
  address: string,
): Promise<Balance> => {
  try {
    await chaindata.checkApiConnection();
    const accountData = await chaindata.api.query.system.account(address);
    const balance: Balance = {
      free: accountData.data.free.toString(),
    };
    return balance;
  } catch (e) {
    logger.error(`Error getting balance: ${e}`, chaindataLabel);
    throw new Error(`Failed to get balance for address ${address}: ${e}`);
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
): Promise<Exposure> => {
  try {
    await chaindata.checkApiConnection();
    const denom = await chaindata.getDenom();
    const eraStakers = await chaindata.api.query.staking.erasStakers(
      eraIndex,
      validator,
    );

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
  } catch (e) {
    logger.error(`Error getting exposure: ${e}`, chaindataLabel);
    throw new Error(
      `Failed to get exposure for validator ${validator} at era ${eraIndex}: ${e}`,
    );
  }
};

export const getExposureAt = async (
  chaindata: ChainData,
  apiAt: any,
  eraIndex: number,
  validator: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const denom = await chaindata.getDenom();
    const eraStakers = await apiAt.query.staking.erasStakers(
      eraIndex,
      validator,
    );
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
  } catch (e) {
    logger.error(`Error getting exposure: ${e}`, chaindataLabel);
  }
};
