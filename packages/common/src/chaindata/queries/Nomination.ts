import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getNominatorAddresses = async (
  chaindata: Chaindata,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const nominators = await chaindata.api.query.staking.nominators.entries();
    const nominatorMap = nominators.map((nominator) => {
      const [address, targets] = nominator;
      return address.toHuman().toString();
    });
    return nominatorMap;
  } catch (e) {
    logger.error(`Error getting nominators: ${e}`, chaindataLabel);
  }
};

export const getNominators = async (chaindata: Chaindata): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const nominatorEntries =
      await chaindata.api.query.staking.nominators.entries();
    const nominators = await Promise.all(
      nominatorEntries.map(async ([key, value]) => {
        const address = key.toHuman()[0];
        const controller = await chaindata.api.query.staking.bonded(address);
        const denom = await chaindata.getDenom();
        const bonded = (
          await chaindata.api.query.staking.ledger(controller.toString())
        ).toJSON();
        // @ts-ignore
        const bondedAmount = bonded?.active ? bonded?.active / denom : 0;
        // @ts-ignore
        const targets = value?.toHuman()?.targets;
        return {
          address: address.toString(),
          bonded: bondedAmount,
          targets: targets,
        };
      }),
    );
    return nominators;
  } catch (e) {
    logger.error(`Error getting nominators: ${e}`, chaindataLabel);
  }
};
