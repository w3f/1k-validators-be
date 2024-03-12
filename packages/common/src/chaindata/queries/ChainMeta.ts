/**
 * Chaindata querying related to chain metadata, blocks, and other chain-specific data.
 *
 * @function ChainMeta
 */

import { ChainData, handleError } from "../chaindata";
import { ApiDecoration } from "@polkadot/api/types";

import { Block } from "@polkadot/types/interfaces";

export const getChainType = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    const chainType = await chaindata?.api?.rpc.system.chain();
    if (chainType) {
      return chainType.toString();
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getChainType");
    return null;
  }
};

export const getDenom = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    const chainType = await chaindata?.api?.rpc.system.chain();
    if (!chainType) {
      return null;
    }
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;
    return denom;
  } catch (e) {
    await handleError(chaindata, e, "getDenom");
    return null;
  }
};

export const getApiAt = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      return (await chaindata?.api?.at(hash)) ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getApiAt");
    return null;
  }
};
export const getApiAtBlockHash = async (
  chaindata: ChainData,
  blockHash: string,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }
    const api = chaindata?.api;
    if (api) {
      const apiResult = await api.at(blockHash);
      return apiResult ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getApiAtBlockHash");
    return null;
  }
};

export const getBlockHash = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<string | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    const hash = await chaindata?.api?.rpc.chain.getBlockHash(blockNumber);
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getBlockHash");
    return null;
  }
};

export const getBlock = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<Block | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }
    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      const signedBlock = await chaindata?.api?.rpc.chain.getBlock(hash);
      return signedBlock?.block ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getBlock");
    return null;
  }
};

export const getLatestBlock = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }
    const block = await chaindata?.api?.rpc.chain.getBlock();
    return block?.block.header.number.toNumber() ?? null;
  } catch (e) {
    await handleError(chaindata, e, "getLatestBlock");
    return null;
  }
};
export const getLatestBlockHash = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }
    const hash = await chaindata?.api?.rpc.chain.getBlockHash();
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getLatestBlockHash");
    return null;
  }
};
