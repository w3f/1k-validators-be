import ChainData, { chaindataLabel } from "../chaindata";
import { ApiPromise } from "@polkadot/api";
import logger from "../../logger";
import { NumberResult } from "../../types";
import {
  KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS,
  POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS,
  TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS,
} from "../../constants";

export const getEraAt = async (
  chaindata: ChainData,
  apiAt: ApiPromise,
): Promise<number> => {
  try {
    await chaindata.checkApiConnection();

    return ((await apiAt.query.staking.activeEra()).toJSON() as any)
      .index as number;
  } catch (e) {
    logger.error(`Error getting era: ${e}`, chaindataLabel);
  }
};

export const getTotalEraPoints = async (
  chaindata: ChainData,
  era: number,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const chainType = await chaindata.getChainType();
    const [blockHash, err] = await chaindata.findEraBlockHash(era, chainType);
    const apiAt = await chaindata.api.at(blockHash);

    const erasRewardPoints = await apiAt.query.staking.erasRewardPoints(era);
    const total = erasRewardPoints.total;
    const validators = erasRewardPoints.individual;
    const vals = [];
    for (const [address, points] of validators.entries()) {
      vals.push({
        era: era,
        address: address.toString(),
        eraPoints: Number(points),
      });
    }
    return {
      era: era,
      total: Number(total),
      validators: vals,
    };
  } catch (e) {
    logger.error(`Error getting total era points: ${e}`, chaindataLabel);
  }
};

export const getErasMinStakeAt = async (
  chaindata: ChainData,
  apiAt: any,
  era: number,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();

    const denom = await chaindata.getDenom();
    const erasStakers = await apiAt.query.staking.erasStakers.entries(era);
    const minStake = erasStakers
      .map(([key, stake]) => {
        // const [era, validator] = key.toHuman();
        const { total, own, others } = stake.toHuman();
        return {
          total: parseFloat(total.replace(/,/g, "")) / denom,
        };
      })
      .sort((a, b) => a.total - b.total);

    if (minStake.length == 0) {
      logger.error(
        `{Chaindata::getErasMinStakeAt} No min stake found for era ${era}`,
      );
      return 0;
    } else {
      return minStake[0]?.total;
    }
  } catch (e) {
    logger.error(`Error getting era min stake: ${e}`, chaindataLabel);
  }
};

export const getActiveEraIndex = async (
  chaindata: ChainData,
): Promise<NumberResult> => {
  try {
    await chaindata.checkApiConnection();
    const activeEra = await chaindata.api.query.staking.activeEra();
    if (activeEra.isNone) {
      logger.info(`NO ACTIVE ERA: ${activeEra.toString()}`);
      return [
        null,
        `Acitve era not found, this chain is might be using an older staking pallet.`,
      ];
    }
    return [activeEra.unwrap().index.toNumber(), null];
  } catch (e) {
    logger.error(`Error getting active era index: ${e}`, chaindataLabel);
  }
};

export const getCurrentEra = async (chaindata: ChainData): Promise<number> => {
  try {
    await chaindata.checkApiConnection();
    const currentEra = await chaindata.api.query.staking.currentEra();
    return Number(currentEra);
  } catch (e) {
    logger.error(`Error getting current era: ${e}`, chaindataLabel);
  }
};

export const findEraBlockHash = async (
  chaindata: ChainData,
  era: number,
  chainType: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const eraBlockLength =
      chainType == "Kusama"
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == "Polkadot"
          ? POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS
          : TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS;

    await chaindata.checkApiConnection();

    const [activeEraIndex, err] = await chaindata.getActiveEraIndex();
    if (err) {
      return [null, err];
    }

    if (era > activeEraIndex) {
      return [null, "Era has not happened."];
    }

    const latestBlock = await chaindata.api.rpc.chain.getBlock();
    if (era == activeEraIndex) {
      return [latestBlock.block.header.hash.toString(), null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.block.header.number.toNumber() - approxBlocksAgo;
    while (true && testBlockNumber > 0) {
      const blockHash = await chaindata.api.rpc.chain.getBlockHash(
        parseInt(String(testBlockNumber)),
      );
      const testEra = await chaindata.api.query.staking.activeEra.at(blockHash);
      if (testEra.isNone) {
        logger.info(`Test era is none`);
        return [null, "Test era is none"];
      }
      const testIndex = testEra.unwrap().index.toNumber();
      if (era == testIndex) {
        return [blockHash.toString(), null];
      }

      if (testIndex > era) {
        testBlockNumber = testBlockNumber - eraBlockLength / 3;
      }

      if (testIndex < era) {
        testBlockNumber = testBlockNumber + eraBlockLength;
      }
    }
  } catch (e) {
    logger.error(`Error finding block hash for era: ${e}`, chaindataLabel);
    return [null, e];
  }
};

export const findEraBlockNumber = async (
  chaindata: ChainData,
  era: number,
  chainType: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const eraBlockLength =
      chainType == "Kusama"
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == "Polkadot"
          ? POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS
          : TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS;

    await chaindata.checkApiConnection();

    const [activeEraIndex, err] = await chaindata.getActiveEraIndex();
    if (err) {
      return [null, err];
    }

    if (era > activeEraIndex) {
      return [null, "Era has not happened."];
    }

    const latestBlock = await chaindata.api.rpc.chain.getBlock();
    if (era == activeEraIndex) {
      return [latestBlock.block.header.number, null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.block.header.number.toNumber() - approxBlocksAgo;
    while (true && testBlockNumber > 0) {
      const blockHash = await chaindata.api.rpc.chain.getBlockHash(
        parseInt(String(testBlockNumber)),
      );
      const testEra = await chaindata.api.query.staking.activeEra.at(blockHash);
      if (testEra.isNone) {
        logger.info(`Test era is none`);
        return [null, "Test era is none"];
      }
      const testIndex = testEra.unwrap().index.toNumber();
      if (era == testIndex) {
        return [testBlockNumber, null];
      }

      if (testIndex > era) {
        testBlockNumber = testBlockNumber - eraBlockLength / 3;
      }

      if (testIndex < era) {
        testBlockNumber = testBlockNumber + eraBlockLength;
      }
    }
  } catch (e) {
    logger.error(`Error finding block hash for era: ${e}`, chaindataLabel);
    return [null, e];
  }
};
