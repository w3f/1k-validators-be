import { logger, queries } from "../../../index";
import { jobsMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { setValidatorRanks, withExecutionTimeLogging } from "../../../utils";

export const erastatsLabel = { label: "EraStatsJob" };

export const eraStatsJob = async (metadata: jobsMetadata): Promise<boolean> => {
  try {
    const { chaindata } = metadata;
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
    jobStatusEmitter.emit("jobProgress", {
      name: "Era Stats Job",
      progress: 0,
      updated: Date.now(),
    });

    // Try and store identities:
    for (const [index, validator] of validators.entries()) {
      // Emit progress update for each validator processed
      const progressPercentage = ((index + 1) / validators.length) * 100;
      jobStatusEmitter.emit("jobProgress", {
        name: "Era Stats Job",
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed validator: ${validator}`,
      });
    }

    await queries.setValidatorSet(currentSession, currentEra, validators);

    // Emit progress update after storing identities
    jobStatusEmitter.emit("jobProgress", {
      name: "Era Stats Job",
      progress: 25,
      updated: Date.now(),
    });

    for (let i = currentEra; i > 20; i--) {
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
      jobStatusEmitter.emit("jobProgress", {
        name: "Era Stats Job",
        progress: progressPercentage,
        updated: Date.now(),
        iteration: `Processed era: ${i}`,
      });
    }

    // Emit progress update after processing eras
    jobStatusEmitter.emit("jobProgress", {
      name: "Era Stats Job",
      progress: 100,
      updated: Date.now(),
    });

    await setValidatorRanks();

    const allCandidates = await queries.allCandidates();
    const valid = allCandidates.filter((candidate) => candidate.valid);
    const active = allCandidates.filter((candidate) => candidate.active);

    await queries.setEraStats(
      Number(currentEra),
      allCandidates.length,
      valid.length,
      active.length,
    );

    return true;
  } catch (e) {
    logger.error(`Error running era stats job: ${e}`, erastatsLabel);
    return false;
  }
};

export const eraStatsJobWithTiming = withExecutionTimeLogging(
  eraStatsJob,
  erastatsLabel,
  "Era Stats Job Done",
);

export const processEraStatsJob = async (job: any, metadata: jobsMetadata) => {
  await eraStatsJob(metadata);
};
