import { logger, queries } from "../../../index";
import { JobEvent, JobKey, JobRunnerMetadata, JobStatus } from "../types";
import { jobStatusEmitter } from "../../../Events";
import {
  setAllIdentities,
  setValidatorRanks,
  withExecutionTimeLogging,
} from "../../../utils";

export const erastatsLabel = { label: "EraStatsJob" };

export const eraStatsJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { chaindata } = metadata;

    await setAllIdentities(chaindata, erastatsLabel);
    await setValidatorRanks();

    const currentSession = await chaindata.getSession();
    const currentEra = await chaindata.getCurrentEra();
    const validators = await chaindata.currentValidators();

    if (!currentSession || !currentEra || !validators) {
      logger.error(
        "Error getting current session, era, or validators",
        erastatsLabel,
      );
      return false;
    }
    // Emit progress update indicating the start of the job
    jobStatusEmitter.emit(JobEvent.Progress, {
      name: JobKey.EraStats,
      progress: 0,
    });
    const allCandidates = await queries.allCandidates();
    const valid = allCandidates.filter((candidate) => candidate.valid);
    const active = allCandidates.filter((candidate) => candidate.active);
    const kyc = allCandidates.filter((candidate) => candidate.kyc);

    await queries.setEraStats(
      Number(currentEra),
      allCandidates.length,
      valid.length,
      active.length,
      kyc.length,
    );

    // Try and store identities:
    for (const [index, validator] of validators.entries()) {
      // Emit progress update for each validator processed
      const progressPercentage = ((index + 1) / validators.length) * 100;
      jobStatusEmitter.emit(JobEvent.Progress, {
        name: JobKey.EraStats,
        progress: progressPercentage,
        iteration: `Processed validator: ${validator}`,
      });
    }

    await queries.setValidatorSet(currentSession, currentEra, validators);

    // Emit progress update after storing identities
    jobStatusEmitter.emit(JobEvent.Progress, {
      name: JobKey.EraStats,
      progress: 25,
    });

    for (let i = currentEra; i > currentEra - 20; i--) {
      if (await queries.validatorSetExistsForEra(i)) {
        continue;
      }
      logger.info(
        `Adding Validator Set for Era: ${i} (${currentEra - i}/${currentEra})`,
        erastatsLabel,
      );
      const validators = await chaindata.getValidatorsAtEra(i);
      const session = await chaindata.getSessionAtEra(i);
      if (!session || !validators) {
        logger.error(
          `Error getting session or validators for era ${i}`,
          erastatsLabel,
        );
        continue;
      }
      await queries.setValidatorSet(session, i, validators);

      // Emit progress update for each era processed
      const progressPercentage = ((currentEra - i) / (currentEra - 20)) * 100;
      jobStatusEmitter.emit(JobEvent.Progress, {
        name: JobKey.EraStats,
        progress: progressPercentage,
        iteration: `Processed era: ${i}`,
      });
    }

    // Emit progress update after processing eras
    jobStatusEmitter.emit(JobEvent.Progress, {
      name: JobKey.EraStats,
      progress: 100,
    });

    await setValidatorRanks();
    jobStatusEmitter.emit(JobEvent.Finished, {
      status: JobStatus.Finished,
      name: JobKey.EraStats,
    });
    return true;
  } catch (e) {
    logger.error(`Error running era stats job: ${e}`, erastatsLabel);
    jobStatusEmitter.emit(JobEvent.Failed, {
      status: JobStatus.Failed,
      name: JobKey.EraStats,
      error: JSON.stringify(e),
    });
    return false;
  }
};

export const eraStatsJobWithTiming = withExecutionTimeLogging(
  eraStatsJob,
  erastatsLabel,
  "Era Stats Job Done",
);

export const processEraStatsJob = async (
  job: any,
  metadata: JobRunnerMetadata,
) => {
  await eraStatsJob(metadata);
};
