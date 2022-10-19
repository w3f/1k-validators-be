import { logger, Db, ChainData } from "@1kv/common";

export const eraPointsJob = async (db, chaindata: ChainData) => {
  const start = Date.now();

  // Set Era Points
  //    - get the current active era
  //    - iterate through the previous 84 eras
  //    - if a record for era points for that era already exists, skip it
  //    - if a record doesn't exist, create it
  logger.info(`{cron::EraPointsJob} setting era info`);
  const [activeEra, err] = await chaindata.getActiveEraIndex();
  for (let i = activeEra - 1; i > activeEra - 84 && i >= 0; i--) {
    const erapoints = await db.getTotalEraPoints(i);

    if (!!erapoints && erapoints.totalEraPoints >= 70000 && erapoints.median) {
      continue;
    } else {
      logger.info(
        `{cron::EraPointsJob} era ${i} point data doesnt exist. Creating....`
      );
      const { era, total, validators } = await chaindata.getTotalEraPoints(i);
      await db.setTotalEraPoints(era, total, validators);
    }
  }
  const { era, total, validators } = await chaindata.getTotalEraPoints(
    activeEra
  );
  await db.setTotalEraPoints(era, total, validators);

  const end = Date.now();

  logger.info(
    `{cron::EraPointsJob::ExecutionTime} started at ${new Date(
      start
    ).toString()} Done. Took ${(end - start) / 1000} seconds`
  );
};

export const processEraPointsJob = async (
  job: any,
  db: Db,
  chaindata: ChainData
) => {
  logger.info(`Processing Era Points Job....`);
  await eraPointsJob(db, chaindata);
};
