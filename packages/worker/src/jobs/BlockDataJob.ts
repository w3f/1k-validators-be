import {ChainData, logger} from "@1kv/common";


export const blockDataJob(chaindata: ChainData, blockNumber) => {
    const start = Date.now();

    logger.info(`Starting ${blockNumber}`);

}
