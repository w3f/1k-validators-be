import { logger, queries, ChainData } from "@1kv/common";

export const erapointsLabel = { label: "EraPointsJob" };

// Gets and sets the total era points for a given era
export const individualEraPointsJob = async (
  chaindata: ChainData,
  eraIndex: number
) => {
  const erapoints = await queries.getTotalEraPoints(eraIndex);

  // If Era Points for the era exist, and are what the total should be, skip
  if (!!erapoints && erapoints.totalEraPoints >= 70000 && erapoints.median) {
    return;
  } else {
    const { era, total, validators } = await chaindata.getTotalEraPoints(
      eraIndex
    );
    await queries.setTotalEraPoints(era, total, validators);
  }
};

export const eraPointsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  // Set Era Points
  //    - get the current active era
  //    - iterate through the previous 84 eras
  //    - if a record for era points for that era already exists, skip it
  //    - if a record doesn't exist, create it
  const [activeEra, err] = await chaindata.getActiveEraIndex();
  for (let i = activeEra - 1; i > activeEra - 84 && i >= 0; i--) {
    await individualEraPointsJob(chaindata, i);
  }

  const end = Date.now();
  const executionTime = (end - start) / 1000;

  logger.info(`Done. (${executionTime}s)`, erapointsLabel);
};

export const processEraPointsJob = async (job: any, chaindata: ChainData) => {
  await eraPointsJob(chaindata);
};
