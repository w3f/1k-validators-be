import Chaindata, { handleError, HandlerType } from "../chaindata";
import logger from "../../logger";

export const getActiveValidatorsInPeriod = async (
  chaindata: Chaindata,
  startEra: number,
  endEra: number,
  chainType: string,
): Promise<[string[] | null, string | null]> => {
  try {
    const allValidators: Set<string> = new Set();
    let testEra = startEra;
    while (testEra <= endEra) {
      const [blockHash, err] = await chaindata.findEraBlockHash(
        testEra,
        chainType,
      );
      if (!blockHash || err) {
        return [null, err];
      }

      const api = await chaindata.handler.getApi();
      const validators = await api.query.session.validators.at(blockHash);
      if (!validators) {
        return [null, "Error getting validators"];
      }
      for (const v of validators.toHuman() as any) {
        if (!allValidators.has(v)) {
          allValidators.add(v);
        }
      }

      testEra++;
    }
    logger.info(`Found active vaildators in period.`);

    return [Array.from(allValidators), null];
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getActiveValidatorsInPeriod",
      HandlerType.RelayHandler,
    );
    return [[], JSON.stringify(e)];
  }
};

export const currentValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    const api = await chaindata.handler.getApi();
    const validators = await api.query.session.validators();
    if (!validators) {
      return [];
    }
    return validators.toJSON() as string[];
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "currentValidators",
      HandlerType.RelayHandler,
    );
    return [];
  }
};

export const getValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    const api = await chaindata.handler.getApi();
    const keys = await api.query.staking.validators.keys();
    if (!keys) {
      return [];
    }
    const validators = keys.map((key) => key.args[0].toString());

    return validators;
  } catch (e) {
    await handleError(chaindata, e, "getValidators", HandlerType.RelayHandler);
    return [];
  }
};

export const getValidatorsAt = async (
  chaindata: Chaindata,
  apiAt: any,
): Promise<string[]> => {
  try {
    return (await apiAt.query.session.validators()).toJSON();
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getValidatorsAt",
      HandlerType.RelayHandler,
    );
    return [];
  }
};

export const getValidatorsAtEra = async (
  chaindata: Chaindata,
  era: number,
): Promise<string[]> => {
  try {
    const chainType = await chaindata.getChainType();
    if (chainType) {
      const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
      if (blockHash) {
        const api = await chaindata.handler.getApi();
        const apiAt = await api.at(blockHash);
        return getValidatorsAt(chaindata, apiAt);
      }
    }
    return [];
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getValidatorsAtEra",
      HandlerType.RelayHandler,
    );
    return [];
  }
};

export const getAssociatedValidatorAddresses = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    const addresses: string[] = [];

    const api = await chaindata.handler.getApi();
    const keys = await api.query.staking.validators.keys();
    if (!keys) {
      return [];
    }
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString(),
    );
    for (const validator of validators) {
      if (!addresses.includes(validator.toString())) {
        addresses.push(validator.toString());
      }
      const controller = await chaindata.getControllerFromStash(validator);
      if (controller && !addresses.includes(controller.toString())) {
        addresses.push(controller.toString());
      }
    }

    return addresses;
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getAssociatedValidatorAddresses",
      HandlerType.RelayHandler,
    );
    return [];
  }
};
