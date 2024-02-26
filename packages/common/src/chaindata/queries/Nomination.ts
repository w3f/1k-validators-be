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

export interface NominatorInfo {
  address: string;
  bonded: number;
  targets: string[];
}

export const getNominators = async (
  chaindata: Chaindata,
): Promise<NominatorInfo[]> => {
  try {
    await chaindata.checkApiConnection();
    const nominatorEntries =
      await chaindata.api.query.staking.nominators.entries();
    return await Promise.all(
      nominatorEntries.map(async ([key, value]) => {
        const address = key.toHuman()[0];
        const controller = await chaindata.getControllerFromStash(address);
        const denom = await chaindata.getDenom();
        const [bonded, err] = await chaindata.getBondedAmount(controller);
        const targets = (value?.toHuman() as { targets: string[] })?.targets;
        return {
          address,
          bonded: bonded / denom,
          targets,
        };
      }),
    );
  } catch (e) {
    logger.error(`Error getting nominators: ${e}`, chaindataLabel);
    return [];
  }
};
