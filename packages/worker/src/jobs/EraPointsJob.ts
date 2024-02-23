import { ChainData, logger, queries } from "@1kv/common";

export const erapointsLabel = { label: "EraPointsJob" };

// Gets and sets the total era points for a given era
export const individualEraPointsJob = async (
  chaindata: ChainData,
  eraIndex: number,
) => {
  const erapoints = await queries.getTotalEraPoints(eraIndex);

  // If Era Points for the era exist, and are what the total should be, skip
  if (!!erapoints && erapoints.totalEraPoints >= 0 && erapoints.median) {
    return;
  } else {
    const { era, total, validators } =
      await chaindata.getTotalEraPoints(eraIndex);
    await queries.setTotalEraPoints(era, total, validators);
  }

  // Update ranks for candidates to be the max number of eras active of any identity within a validators sub/super identity
  const candidates = await queries.allCandidates();
  for (const [index, candidate] of candidates.entries()) {
    const rank =
      (await queries.getIdentityValidatorEraPointsCountMax(candidate.stash)) ||
      0;
    await queries.setRank(candidate.stash, rank);
    logger.info(
      `Updated Rank for ${candidate.stash} to ${rank} (${index + 1}/${candidates.length})`,
      erapointsLabel,
    );
  }
};

export const eraPointsJob = async (chaindata: ChainData) => {
  const start = Date.now();

  // Set Era Points
  //    - get the current active era
  //    - iterate through the previous eras until the first era
  //    - if a record for era points for that era already exists, skip it
  //    - if a record doesn't exist, create it
  const [activeEra, err] = await chaindata.getActiveEraIndex();
  for (let i = activeEra - 1; i >= 0; i--) {
    await individualEraPointsJob(chaindata, i);
    logger.info(
      `Processed Era Points for Era: ${i} (${activeEra - i}/${activeEra})`,
      erapointsLabel,
    );
  }

  const end = Date.now();
  const executionTime = (end - start) / 1000;

  logger.info(`Done. (${executionTime}s)`, erapointsLabel);
};

export const processEraPointsJob = async (job: any, chaindata: ChainData) => {
  await eraPointsJob(chaindata);
};
