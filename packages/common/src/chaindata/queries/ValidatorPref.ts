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

export const getQueuedKeys = async (chaindata: ChainData): Promise<any> => {
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

export const getNextKeys = async (
  chaindata: ChainData,
  stash: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const nextKeys = await chaindata.api.query.session.nextKeys(stash);
    return nextKeys;
  } catch (e) {
    logger.error(`Error getting next keys: ${e}`, chaindataLabel);
  }
};

export const getBalance = async (
  chaindata: ChainData,
  address: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const balance = chaindata.api.query.system.account(address);
    return (await balance).data.toJSON();
  } catch (e) {
    logger.error(`Error getting balance: ${e}`, chaindataLabel);
  }
};

export const getExposure = async (
  chaindata: ChainData,
  eraIndex: number,
  validator: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const denom = await chaindata.getDenom();
    const eraStakers = await chaindata.api.query.staking.erasStakers(
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
