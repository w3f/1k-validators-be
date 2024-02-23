import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getActiveValidatorsInPeriod = async (
  chaindata: Chaindata,
  startEra: number,
  endEra: number,
  chainType: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const allValidators: Set<string> = new Set();
    let testEra = startEra;
    while (testEra <= endEra) {
      const [blockHash, err] = await chaindata.findEraBlockHash(
        testEra,
        chainType,
      );
      if (err) {
        return [null, err];
      }

      const validators =
        await chaindata.api.query.session.validators.at(blockHash);
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
    console.error(`Error getting active validators: ${e}`);
  }
};

export const currentValidators = async (chaindata: Chaindata): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const validators = await chaindata.api.query.session.validators();
    return validators.toJSON();
  } catch (e) {
    logger.error(`Error getting current validators: ${e}`, chaindataLabel);
  }
};

export const getValidators = async (chaindata: Chaindata): Promise<any> => {
  try {
    const keys = await chaindata.api.query.staking.validators.keys();
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString(),
    );

    return validators;
  } catch (e) {
    logger.error(`Error getting validators: ${e}`, chaindataLabel);
  }
};

export const getValidatorsAt = async (
  chaindata: Chaindata,
  apiAt: any,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    return (await apiAt.query.session.validators()).toJSON();
  } catch (e) {
    logger.error(`Error getting validators at: ${e}`, chaindataLabel);
  }
};

export const getValidatorsAtEra = async (
  chaindata: Chaindata,
  era: number,
): Promise<any> => {
  const chainType = await chaindata.getChainType();
  const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
  const apiAt = await chaindata.api.at(blockHash);
  return getValidatorsAt(chaindata, apiAt);
};

export const getAssociatedValidatorAddresses = async (
  chaindata: Chaindata,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const addresses = [];

    const keys = await chaindata.api.query.staking.validators.keys();
    const validators = keys.map(({ args: [validatorId] }) =>
      validatorId.toString(),
    );
    for (const validator of validators) {
      if (!addresses.includes(validator.toString())) {
        addresses.push(validator.toString());
      }
      const controller = await chaindata.getControllerFromStash(validator);
      if (!addresses.includes(controller.toString())) {
        addresses.push(controller.toString());
      }
    }

    return addresses;
  } catch (e) {
    logger.error(`Error getting validators: ${e}`, chaindataLabel);
  }
};
