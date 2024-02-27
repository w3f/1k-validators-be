/**
 * Chaindata querying related to chain metadata, blocks, and other chain-specific data.
 *
 * @function ChainMeta
 */

import { ChainData, chaindataLabel } from "../chaindata";
import { logger } from "../../index";
import { ApiDecoration } from "@polkadot/api/types";

import { Block } from "@polkadot/types/interfaces";

export const getChainType = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    await chaindata.checkApiConnection();

    const chainType = await chaindata?.api?.rpc.system.chain();
    if (chainType) {
      return chainType.toString();
    }
    return null;
  } catch (e) {
    logger.error(`Error getting chain type: ${e}`, chaindataLabel);
    return null;
  }
};

export const getDenom = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    await chaindata.checkApiConnection();

    const chainType = await chaindata?.api?.rpc.system.chain();
    if (!chainType) {
      return null;
    }
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;
    return denom;
  } catch (e) {
    logger.error(`Error getting chain denom: ${e}`, chaindataLabel);
    return null;
  }
};

export const getApiAt = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    await chaindata.checkApiConnection();

    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      return (await chaindata?.api?.at(hash)) ?? null;
    } else {
      return null;
    }
  } catch (e) {
    logger.error(`Error getting api at block: ${e}`, chaindataLabel);
    return null;
  }
};
export const getApiAtBlockHash = async (
  chaindata: ChainData,
  blockHash: string,
): Promise<ApiDecoration<"promise"> | null> => {
  try {
    await chaindata.checkApiConnection();
    const api = chaindata?.api;
    if (api) {
      const apiResult = await api.at(blockHash);
      return apiResult ?? null;
    } else {
      return null;
    }
  } catch (e) {
    logger.error(
      `Error getting api at block hash ${blockHash}: ${e}`,
      chaindataLabel,
    );
    return null;
  }
};

export const getBlockHash = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<string | null> => {
  try {
    await chaindata.checkApiConnection();

    const hash = await chaindata?.api?.rpc.chain.getBlockHash(blockNumber);
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    logger.error(`Error getting block hash: ${e}`, chaindataLabel);
    return null;
  }
};

export const getBlock = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<Block | null> => {
  try {
    await chaindata.checkApiConnection();
    const hash = await chaindata.getBlockHash(blockNumber);
    if (hash) {
      const signedBlock = await chaindata?.api?.rpc.chain.getBlock(hash);
      return signedBlock?.block ?? null;
    } else {
      return null;
    }
  } catch (e) {
    logger.error(`Error getting block: ${e}`, chaindataLabel);
    return null;
  }
};

export const getLatestBlock = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    await chaindata.checkApiConnection();
    const block = await chaindata?.api?.rpc.chain.getBlock();
    return block?.block.header.number.toNumber() ?? null;
  } catch (e) {
    logger.error(`Error getting latest block: ${e}`, chaindataLabel);
    return null;
  }
};
export const getLatestBlockHash = async (
  chaindata: ChainData,
): Promise<string | null> => {
  try {
    await chaindata.checkApiConnection();
    const hash = await chaindata?.api?.rpc.chain.getBlockHash();
    if (hash) {
      return hash.toString();
    }
    return null;
  } catch (e) {
    logger.error(`Error getting latest block hash: ${e}`, chaindataLabel);
    return null;
  }
};
