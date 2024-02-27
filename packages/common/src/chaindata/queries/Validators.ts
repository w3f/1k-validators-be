import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getActiveValidatorsInPeriod = async (
  chaindata: Chaindata,
  startEra: number,
  endEra: number,
  chainType: string,
): Promise<[string[] | null, string | null]> => {
  try {
    await chaindata.checkApiConnection();
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
    console.error(`Error getting active validators: ${JSON.stringify(e)}`);
    return [[], JSON.stringify(e)];
  }
};

export const currentValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    await chaindata.checkApiConnection();
    const validators = await chaindata.api?.query.session.validators();
    if (!validators) {
      return [];
    }
    return validators.toJSON() as string[];
  } catch (e) {
    logger.error(`Error getting current validators: ${e}`, chaindataLabel);
    return [];
  }
};

export const getValidators = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    const keys = await chaindata.api?.query.staking.validators.keys();
    if (!keys) {
      return [];
    }
    const validators = keys.map((key) => key.args[0].toString());

    return validators;
  } catch (e) {
    logger.error(`Error getting validators: ${e}`, chaindataLabel);
    return [];
  }
};

export const getValidatorsAt = async (
  chaindata: Chaindata,
  apiAt: any,
): Promise<string[]> => {
  try {
    await chaindata.checkApiConnection();
    return (await apiAt.query.session.validators()).toJSON();
  } catch (e) {
    logger.error(`Error getting validators at: ${e}`, chaindataLabel);
    return [];
  }
};

export const getValidatorsAtEra = async (
  chaindata: Chaindata,
  era: number,
): Promise<string[]> => {
  const chainType = await chaindata.getChainType();
  if (chainType) {
    const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
    if (blockHash) {
      const apiAt = await chaindata.api?.at(blockHash);
      return getValidatorsAt(chaindata, apiAt);
    }
  }
  return [];
};

export const getAssociatedValidatorAddresses = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    await chaindata.checkApiConnection();
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
    logger.error(`Error getting validators: ${e}`, chaindataLabel);
    return [];
  }
};
