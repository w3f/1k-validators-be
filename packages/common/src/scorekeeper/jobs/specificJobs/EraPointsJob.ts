import { ChainData, logger, queries } from "../../../index";
import { jobsMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";

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
    const data = await chaindata.getTotalEraPoints(eraIndex);
    if (data) {
      const { era, total, validators } = data;
      await queries.setTotalEraPoints(era, total, validators);
    }
  }
};
export const eraPointsJob = async (
  metadata: jobsMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
    // Set Era Points
    //    - get the current active era
    //    - iterate through the previous eras until the first era
    //    - if a record for era points for that era already exists, skip it
    //    - if a record doesn't exist, create it
    const [activeEra, err] = await chaindata.getActiveEraIndex();

    // Calculate total number of eras to process
    const totalEras = activeEra;
    let processedEras = 0;

    for (let i = activeEra - 1; i >= 0; i--) {
      await individualEraPointsJob(chaindata, i);

      // Calculate progress percentage
      processedEras++;
      const progress = (processedEras / totalEras) * 100;

      // Emit progress update with active era as iteration
      jobStatusEmitter.emit("jobProgress", {
        name: "Era Points Job",
        progress,
        updated: Date.now(),
        iteration: `Active era: ${i}`,
      });

      logger.info(
        `Processed Era Points for Era: ${i} (${activeEra - i}/${activeEra})`,
        erapointsLabel,
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error running era points job: ${e}`, erapointsLabel);
    return false;
  }
};

export const eraPointsJobWithTiming = withExecutionTimeLogging(
  eraPointsJob,
  erapointsLabel,
  "Era Points Job Done",
);

export const processEraPointsJob = async (job: any, metadata: jobsMetadata) => {
  await eraPointsJob(metadata);
};
