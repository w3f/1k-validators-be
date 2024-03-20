import Chaindata, { handleError } from "../chaindata";
import logger from "../../logger";

export const getActiveValidatorsInPeriod = async (
  chaindata: Chaindata,
  startEra: number,
  endEra: number,
  chainType: string,
): Promise<[string[] | null, string | null]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [null, null];
    }
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

      const validators =
        await chaindata.api?.query.session.validators.at(blockHash);
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
    await handleError(chaindata, e, "getActiveValidatorsInPeriod");
    return [[], JSON.stringify(e)];
  }
};

export const currentValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }

    const validators = await chaindata.api?.query.session.validators();
    if (!validators) {
      return [];
    }
    return validators.toJSON() as string[];
  } catch (e) {
    await handleError(chaindata, e, "currentValidators");
    return [];
  }
};

export const getValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const keys = await chaindata.api?.query.staking.validators.keys();
    if (!keys) {
      return [];
    }
    const validators = keys.map((key) => key.args[0].toString());

    return validators;
  } catch (e) {
    await handleError(chaindata, e, "getValidators");
    return [];
  }
};

export const getValidatorsAt = async (
  chaindata: Chaindata,
  apiAt: any,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    return (await apiAt.query.session.validators()).toJSON();
  } catch (e) {
    await handleError(chaindata, e, "getValidatorsAt");
    return [];
  }
};

export const getValidatorsAtEra = async (
  chaindata: Chaindata,
  era: number,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const chainType = await chaindata.getChainType();
    if (chainType) {
      const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
      if (blockHash) {
        const apiAt = await chaindata.api?.at(blockHash);
        return getValidatorsAt(chaindata, apiAt);
      }
    }
    return [];
  } catch (e) {
    await handleError(chaindata, e, "getValidatorsAtEra");
    return [];
  }
};

export const getAssociatedValidatorAddresses = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const addresses: string[] = [];

    const keys = await chaindata.api?.query.staking.validators.keys();
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
    await handleError(chaindata, e, "getAssociatedValidatorAddresses");
    return [];
  }
};
