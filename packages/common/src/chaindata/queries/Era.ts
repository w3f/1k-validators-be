import ChainData, { handleError } from "../chaindata";
import logger from "../../logger";
import { NumberResult, StringResult } from "../../types";
import {
  KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS,
  POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS,
  TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS,
} from "../../constants";
import { ApiDecoration } from "@polkadot/api/types";

export const getEraAt = async (
  chaindata: ChainData,
  apiAt: ApiDecoration<"promise">,
): Promise<number | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    return ((await apiAt.query.staking.activeEra()).toJSON() as any)
      .index as number;
  } catch (e) {
    await handleError(chaindata, e, "getEraAt");
    return null;
  }
};

export interface EraPointsInfo {
  era: number;
  total: number;
  validators: Array<{
    era: number;
    address: string;
    eraPoints: number;
  }>;
}
export const getTotalEraPoints = async (
  chaindata: ChainData,
  era: number,
): Promise<EraPointsInfo> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return {} as EraPointsInfo;
    }
    const chainType = await chaindata.getChainType();
    if (!chainType) {
      return {} as EraPointsInfo;
    }
    const [blockHash, err] = await chaindata.findEraBlockHash(
      era + 1,
      chainType,
    );

    if (blockHash) {
      const apiAt = await chaindata?.api?.at(blockHash);

      if (!apiAt) {
        return {} as EraPointsInfo;
      }

      const erasRewardPoints = await apiAt.query.staking.erasRewardPoints(era);
      const total = erasRewardPoints?.total;
      const validators = erasRewardPoints?.individual;
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
    }
    return {} as EraPointsInfo;
  } catch (e) {
    await handleError(chaindata, e, "getTotalEraPoints");
    return {} as EraPointsInfo;
  }
};

export const getErasMinStakeAt = async (
  chaindata: ChainData,
  apiAt: ApiDecoration<"promise">,
  era: number,
): Promise<number | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }

    const denom: number | null = await chaindata.getDenom();
    if (denom === null) {
      return null;
    }

    const erasStakers = await apiAt.query.staking.erasStakers.entries(era);

    const minStake = erasStakers
      .map(([key, stake]) => {
        const { total } = stake;
        return {
          total: parseFloat(total.toString().replace(/,/g, "")) / denom,
        };
      })
      .sort((a: { total: number }, b: { total: number }) => a.total - b.total);

    if (minStake.length === 0) {
      return 0;
    } else {
      return minStake[0]?.total;
    }
  } catch (e) {
    await handleError(chaindata, e, "getErasMinStakeAt");
    return null;
  }
};

export const getActiveEraIndex = async (
  chaindata: ChainData,
): Promise<NumberResult> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [0, "API not connected"];
    }
    const activeEra = await chaindata?.api?.query.staking.activeEra();
    if (!activeEra || activeEra.isNone) {
      logger.info(`NO ACTIVE ERA:`);
      return [
        0,
        `Acitve era not found, this chain is might be using an older staking pallet.`,
      ];
    }
    const activeEraNumber = activeEra.unwrap().index.toNumber();
    return [activeEraNumber, null];
  } catch (e) {
    await handleError(chaindata, e, "getActiveEraIndex");
    return [0, JSON.stringify(e)];
  }
};

export const getCurrentEra = async (
  chaindata: ChainData,
): Promise<number | null> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return null;
    }
    const currentEra = await chaindata?.api?.query.staking.currentEra();
    return Number(currentEra);
  } catch (e) {
    await handleError(chaindata, e, "getCurrentEra");
    return null;
  }
};

export const findEraBlockHash = async (
  chaindata: ChainData,
  era: number,
  chainType: string,
): Promise<StringResult> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return ["", "API not connected."];
    }
    const eraBlockLength =
      chainType == "Kusama"
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == "Polkadot"
          ? POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS
          : TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS;

    await chaindata.checkApiConnection();

    const [activeEraIndex, err] = await chaindata.getActiveEraIndex();
    if (err) {
      return ["", err];
    }

    if (era > activeEraIndex) {
      return ["", "Era has not happened."];
    }

    const latestBlock = await chaindata?.api?.rpc.chain.getBlock();
    if (!latestBlock) {
      return ["", "Latest block is null"];
    }
    if (era == activeEraIndex) {
      return [latestBlock.block.header.hash.toString(), null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.block.header.number.toNumber() - approxBlocksAgo;
    while (true && testBlockNumber > 0) {
      const blockHash = await chaindata.getBlockHash(testBlockNumber);
      if (!blockHash) {
        return ["", "Block hash is null"];
      }
      const apiAt = await chaindata?.api?.at(blockHash);
      if (!apiAt) {
        return ["", "API at block hash is null"];
      }

      const testEra = await apiAt.query.staking.activeEra();
      if (testEra && testEra.isEmpty) {
        logger.info(`Test era is empty: ${JSON.stringify(testEra)}`);
        return ["", "Test era is none"];
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
    return ["", "Not Found!"];
  } catch (e) {
    await handleError(chaindata, e, "findEraBlockHash");
    return ["", JSON.stringify(e)];
  }
};

export const findEraBlockNumber = async (
  chaindata: ChainData,
  era: number,
  chainType: string,
): Promise<NumberResult> => {
  try {
    if (!(await chaindata.checkApiConnection())) {
      return [0, "API not connected."];
    }
    const eraBlockLength =
      chainType == "Kusama"
        ? KUSAMA_APPROX_ERA_LENGTH_IN_BLOCKS
        : chainType == "Polkadot"
          ? POLKADOT_APPROX_ERA_LENGTH_IN_BLOCKS
          : TESTNET_APPROX_ERA_LENGTH_IN_BLOCKS;

    await chaindata.checkApiConnection();

    const [activeEraIndex, err] = await chaindata.getActiveEraIndex();
    if (err) {
      return [0, err];
    }

    if (era > activeEraIndex) {
      return [0, "Era has not happened."];
    }

    const latestBlockNumber = await chaindata.getLatestBlock();
    if (!latestBlockNumber) {
      return [0, "Latest block is null"];
    }
    const latestBlock = await chaindata.getBlock(latestBlockNumber);
    if (!latestBlock) {
      return [0, "Latest block is null"];
    }
    if (era == activeEraIndex) {
      return [Number(latestBlock.header.number), null];
    }

    const diff = activeEraIndex - era;
    const approxBlocksAgo = diff * eraBlockLength;

    let testBlockNumber =
      latestBlock.header.number.toNumber() - approxBlocksAgo;
    while (true && testBlockNumber > 0) {
      const blockHash = await chaindata.getBlockHash(testBlockNumber);
      if (!blockHash) {
        return [0, "Block hash is null"];
      }
      const testEra =
        (await chaindata?.api?.query.staking.activeEra.at(blockHash)) ||
        undefined; // Handle possible undefined
      if (!testEra || testEra.isNone) {
        logger.info(`Test era is none`);
        return [0, "Test era is none"];
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
    return [0, "Not Found!"];
  } catch (e) {
    await handleError(chaindata, e, "findEraBlockNumber");
    return [0, JSON.stringify(e)];
  }
};
