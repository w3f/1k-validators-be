/**
 * Chaindata querying related to sessions
 *
 * @function Sessio
 */

import { ChainData, chaindataLabel } from "../chaindata";
import { logger } from "../../index";
import { ApiPromise } from "@polkadot/api";

export const getSession = async (chaindata: ChainData): Promise<number> => {
  try {
    await chaindata.checkApiConnection();

    return Number(
      (await chaindata.api.query.session.currentIndex()).toString(),
    );
  } catch (e) {
    logger.error(`Error getting session: ${e}`, chaindataLabel);
  }
};

export const getSessionAt = async (
  chaindata: ChainData,
  apiAt: ApiPromise,
): Promise<number> => {
  try {
    await chaindata.checkApiConnection();

    const session = (await apiAt.query.session.currentIndex()).toString();
    return parseInt(session.replace(/,/g, ""));
  } catch (e) {
    logger.error(`Error getting session: ${e}`, chaindataLabel);
  }
};

export const getSessionAtEra = async (chaindata: ChainData, era: number) => {
  const chainType = await chaindata.getChainType();
  const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
  const apiAt = await chaindata.getApiAtBlockHash(blockHash);
  return getSessionAt(chaindata, apiAt);
};
