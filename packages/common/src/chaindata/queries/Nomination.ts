import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getNominatorAddresses = async (
  chaindata: Chaindata,
): Promise<string[]> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const nominators = await chaindata.api?.query.staking.nominators.entries();
    const nominatorMap = nominators
      ?.map((nominator) => {
        const [key, targets] = nominator;
        const address = key.toHuman();
        if (Array.isArray(address) && address.length > 0) {
          return address && address[0] && address[0].toString()
            ? address[0].toString()
            : undefined;
        }
        return undefined;
      })
      .filter((address) => address !== undefined) as string[];
    return nominatorMap;
  } catch (e) {
    logger.error(`Error getting nominators: ${e}`, chaindataLabel);
    return [];
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
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const nominatorEntries =
      await chaindata.api?.query.staking.nominators.entries();
    if (!nominatorEntries) {
      return [];
    }
    return await Promise.all(
      nominatorEntries.map(async ([key, value]) => {
        const raw = key.toHuman() as string[];
        const address = raw && raw[0] ? raw[0] : "";

        const controller = await chaindata.getControllerFromStash(address);
        if (controller) {
          const denom = await chaindata.getDenom();
          const [bonded, err] = await chaindata.getBondedAmount(controller);
          const targets = (value?.toHuman() as { targets: string[] })?.targets;
          return {
            address,
            bonded: bonded && denom ? bonded / denom : 0,
            targets,
          };
        } else {
          return {} as NominatorInfo;
        }
      }),
    );
  } catch (e) {
    logger.error(`Error getting nominators: ${e}`, chaindataLabel);
    return [];
  }
};
