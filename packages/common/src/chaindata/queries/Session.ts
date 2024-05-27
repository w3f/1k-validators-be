/**
 * Chaindata querying related to sessions
 *
 * @function Sessio
 */

import { ChainData, handleError, HandlerType } from "../chaindata";
import { ApiDecoration } from "@polkadot/api/types";

export const getSession = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const currentIndex = await api.query.session.currentIndex();
    if (currentIndex !== undefined) {
      return Number(currentIndex.toString());
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getSession", HandlerType.RelayHandler);
    return null;
  }
};

export const getSessionAt = async (
  chaindata: ChainData,
  apiAt: ApiDecoration<"promise">,
): Promise<number | null> => {
  try {
    const session = (await apiAt.query.session.currentIndex()).toString();
    return parseInt(session.replace(/,/g, ""));
  } catch (e) {
    await handleError(chaindata, e, "getSessionAt", HandlerType.RelayHandler);
    return null;
  }
};

export const getSessionAtEra = async (
  chaindata: ChainData,
  era: number,
): Promise<number | null> => {
  try {
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
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getSessionAtEra",
      HandlerType.RelayHandler,
    );
    return null;
  }
};
