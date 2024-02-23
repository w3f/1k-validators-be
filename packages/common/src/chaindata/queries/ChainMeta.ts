/**
 * Chaindata querying related to chain metadata, blocks, and other chain-specific data.
 *
 * @function ChainMeta
 */

import { ChainData, chaindataLabel } from "../chaindata";
import { logger } from "../../index";

export const getChainType = async (chaindata: ChainData): Promise<string> => {
  try {
    await chaindata.checkApiConnection();

    const chainType = await chaindata.api.rpc.system.chain();
    return chainType.toString();
  } catch (e) {
    logger.error(`Error getting chain type: ${e}`, chaindataLabel);
  }
};

export const getDenom = async (chaindata: ChainData): Promise<number> => {
  try {
    await chaindata.checkApiConnection();

    const chainType = await chaindata.api.rpc.system.chain();
    const denom =
      chainType.toString() == "Polkadot" ? 10000000000 : 1000000000000;
    return denom;
  } catch (e) {
    logger.error(`Error getting chain denom: ${e}`, chaindataLabel);
  }
};

export const getApiAt = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();

    const hash = await chaindata.getBlockHash(blockNumber);
    return await chaindata.api.at(hash);
  } catch (e) {
    logger.error(`Error getting api at block: ${e}`, chaindataLabel);
  }
};

export const getApiAtBlockHash = async (
  chaindata: ChainData,
  blockHash: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    return await chaindata.api.at(blockHash);
  } catch (e) {
    logger.error(
      `Error getting api at block hash ${blockHash}: ${e}`,
      chaindataLabel,
    );
  }
};

export const getBlockHash = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<string> => {
  try {
    await chaindata.checkApiConnection();

    return (await chaindata.api.rpc.chain.getBlockHash(blockNumber)).toString();
  } catch (e) {
    logger.error(`Error getting block hash: ${e}`, chaindataLabel);
  }
};

export const getBlock = async (
  chaindata: ChainData,
  blockNumber: number,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const hash = await chaindata.getBlockHash(blockNumber);
    return await chaindata.api.rpc.chain.getBlock(hash);
  } catch (e) {
    logger.error(`Error getting block: ${e}`, chaindataLabel);
  }
};

export const getLatestBlock = async (chaindata: ChainData): Promise<number> => {
  try {
    await chaindata.checkApiConnection();
    return (
      await chaindata.api.rpc.chain.getBlock()
    ).block.header.number.toNumber();
  } catch (e) {
    logger.error(`Error getting latest block: ${e}`, chaindataLabel);
  }
};

export const getLatestBlockHash = async (
  chaindata: ChainData,
): Promise<string> => {
  try {
    await chaindata.checkApiConnection();
    return (
      await chaindata.api.rpc.chain.getBlock()
    ).block.header.hash.toString();
  } catch (e) {
    logger.error(`Error getting latest block hash: ${e}`, chaindataLabel);
  }
};
