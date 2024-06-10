/**
 * Chaindata querying related to chain metadata, blocks, and other chain-specific data.
 *
 * @function ChainMeta
 */

import { ChainData, handleError, HandlerType } from "../chaindata";
import { ApiDecoration } from "@polkadot/api/types";

import { Block } from "@polkadot/types/interfaces";

export const getChainType = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const chainType = await api.rpc.system.chain();
    if (chainType) {
      return chainType.toString();
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getChainType", HandlerType.RelayHandler);
    return null;
  }
};

export const getDenom = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    const api = await chaindata.handler.getApi();

    const chainProps = await api.registry.getChainProperties();
    const decimals = chainProps.tokenDecimals.toJSON()[0];

    return 10 ** decimals;
  } catch (e) {
    await handleError(chaindata, e, "getDenom", HandlerType.RelayHandler);
    return null;
  }
};

export const getApiAt = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      const api = await chaindata.handler.getApi();
      return (await api.at(hash)) ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getApiAt", HandlerType.RelayHandler);
    return null;
  }
};
export const getApiAtBlockHash = async (
  chaindata: ChainData,
  blockHash: string,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    const api = await chaindata.handler.getApi();
    if (api) {
      const apiResult = await api.at(blockHash);
      return apiResult ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getApiAtBlockHash",
      HandlerType.RelayHandler,
    );
    return null;
  }
};

export const getBlockHash = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<string | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const hash = await api.rpc.chain.getBlockHash(blockNumber);
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    await handleError(chaindata, e, "getBlockHash", HandlerType.RelayHandler);
    return null;
  }
};

export const getBlock = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<Block | null> => {
  try {
    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      const api = await chaindata.handler.getApi();
      const signedBlock = await api.rpc.chain.getBlock(hash);
      return signedBlock?.block ?? null;
    } else {
      return null;
    }
  } catch (e) {
    await handleError(chaindata, e, "getBlock", HandlerType.RelayHandler);
    return null;
  }
};

export const getLatestBlock = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const block = await api.rpc.chain.getBlock();
    return block?.block.header.number.toNumber() ?? null;
  } catch (e) {
    await handleError(chaindata, e, "getLatestBlock", HandlerType.RelayHandler);
    return null;
  }
};
export const getLatestBlockHash = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    const api = await chaindata.handler.getApi();
    const hash = await api.rpc.chain.getBlockHash();
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    await handleError(
      chaindata,
      e,
      "getLatestBlockHash",
      HandlerType.RelayHandler,
    );
    return null;
  }
};
