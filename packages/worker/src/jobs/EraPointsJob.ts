import { logger, queries, ChainData } from "@1kv/common";

export const erapointsLabel = { label: "EraPointsJob" };

export const eraPointsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  // Set Era Points
  //    - get the current active era
  //    - iterate through the previous 84 eras
  //    - if a record for era points for that era already exists, skip it
  //    - if a record doesn't exist, create it
  logger.info(`setting era info`, erapointsLabel);
  const [activeEra, err] = await chaindata.getActiveEraIndex();
  for (let i = activeEra - 1; i > activeEra - 84 && i >= 0; i--) {
    const erapoints = await queries.getTotalEraPoints(i);

    if (!!erapoints && erapoints.totalEraPoints >= 70000 && erapoints.median) {
      continue;
    } else {
      logger.info(
        `era ${i} point data doesnt exist. Creating....`,
        erapointsLabel
      );
      const { era, total, validators } = await chaindata.getTotalEraPoints(i);
      await queries.setTotalEraPoints(era, total, validators);
    }
  }
  const { era, total, validators } = await chaindata.getTotalEraPoints(
    activeEra
  );
  await queries.setTotalEraPoints(era, total, validators);

  const end = Date.now();

  logger.info(`Done. Took ${(end - start) / 1000} seconds`, erapointsLabel);
};

export const processEraPointsJob = async (job: any, chaindata: ChainData) => {
  logger.info(`Processing Era Points Job....`, erapointsLabel);
  await eraPointsJob(chaindata);
};
