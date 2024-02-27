/**
 * Chaindata querying related to sessions
 *
 * @function Sessio
 */

import { ChainData, chaindataLabel } from "../chaindata";
import { logger } from "../../index";
import { ApiDecoration } from "@polkadot/api/types";

export const getSession = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    await chaindata.checkApiConnection();

    const currentIndex = await chaindata?.api?.query.session.currentIndex();
    if (currentIndex !== undefined) {
      return Number(currentIndex.toString());
    } else {
      return null;
    }
  } catch (e) {
    logger.error(`Error getting session: ${e}`, chaindataLabel);
    return null;
  }
};

export const getSessionAt = async (
  chaindata: ChainData,
  apiAt: ApiDecoration<"promise">,
): Promise<number | null> => {
  try {
    await chaindata.checkApiConnection();

    const session = (await apiAt.query.session.currentIndex()).toString();
    return parseInt(session.replace(/,/g, ""));
  } catch (e) {
    logger.error(`Error getting session: ${e}`, chaindataLabel);
    return null;
  }
};

export const getSessionAtEra = async (
  chaindata: ChainData,
  era: number,
): Promise<number | null> => {
  const chainType = await chaindata.getChainType();
  if (chainType) {
    const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
    if (blockHash) {
      const apiAt = await chaindata.getApiAtBlockHash(blockHash);
      if (apiAt) {
        return getSessionAt(chaindata, apiAt);
      }
    }
  }
  return null;
};
