import { ChainData, Constants, logger, queries } from "../../../index";
import { JobEvent, JobKey, JobRunnerMetadata, JobStatus } from "../types";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";

export const erapointsLabel = { label: "EraPointsJob" };

// Gets and sets the total era points for a given era
export const individualEraPointsJob = async (
  chaindata: ChainData,
  eraIndex: number,
): Promise<boolean> => {
  try {
    const erapoints = await queries.getTotalEraPoints(eraIndex);

    // If Era Points for the era exist, and are what the total should be, skip
    if (!!erapoints && erapoints.totalEraPoints >= 0 && erapoints.median) {
      return false;
    } else {
      const data = await chaindata.getTotalEraPoints(eraIndex);
      if (
        data &&
        data.era == eraIndex &&
        data.total &&
        data.validators &&
        data.validators.length > 0
      ) {
        const { era, total, validators } = data;
        await queries.setTotalEraPoints(era, total, validators);
      } else {
        logger.error(
          `Error getting total era points for era: ${JSON.stringify(data)} is null`,
          erapointsLabel,
        );
        return false;
      }
    }
    return true;
  } catch (e) {
    logger.error(
      `Error running individual era points job: ${JSON.stringify(e)}`,
      erapointsLabel,
    );
    return false;
  }
};
export const eraPointsJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
    // Set Era Points
    //    - get the current active era
    //    - iterate through the previous eras until the first era
    //    - if a record for era points for that era already exists, skip it
    //    - if a record doesn't exist, create it
    const [activeEra, err] = await chaindata.getActiveEraIndex();

    for (
      let i = activeEra - 1, processedEras = 1;
      i >= activeEra - Constants.ERAPOINTS_JOB_MAX_ERAS;
      i--, processedEras++
    ) {
      await individualEraPointsJob(chaindata, i);

      // Calculate progress percentage
      const progress = (processedEras / Constants.ERAPOINTS_JOB_MAX_ERAS) * 100;

      // Emit progress update with active era as iteration
      jobStatusEmitter.emit(JobEvent.Progress, {
        name: JobKey.EraPoints,
        progress,
        iteration: `Active era: ${i}`,
      });

      logger.info(
        `Processed Era Points for Era: ${i} (${activeEra - i}/${Constants.ERAPOINTS_JOB_MAX_ERAS})`,
        erapointsLabel,
      );
    }
    return true;
  } catch (e) {
    logger.error(`Error running era points job: ${e}`, erapointsLabel);
    jobStatusEmitter.emit(JobEvent.Failed, {
      status: JobStatus.Failed,
      name: JobKey.EraPoints,
      error: JSON.stringify(e),
    });
    return false;
  }
};

export const eraPointsJobWithTiming = withExecutionTimeLogging(
  eraPointsJob,
  erapointsLabel,
  "Era Points Job Done",
);

export const processEraPointsJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  await eraPointsJob(metadata);
};
