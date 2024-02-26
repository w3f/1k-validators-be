import { logger, queries } from "../../../index";
import { jobsMetadata } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";

export const sessionkeyLabel = { label: "SessionKeyJob" };

export const sessionKeyJob = async (metadata: jobsMetadata) => {
  try {
    const { chaindata } = metadata;
    const candidates = await queries.allCandidates();

    const validators = await chaindata.getValidators();
    const totalValidators = validators.length;
    let processedValidators = 0;

    const queuedKeys = await chaindata.getQueuedKeys();

    for (const validator of validators) {
      for (const key of queuedKeys) {
        if (key.address == validator) {
          // await queries.setQueuedKeys(validator, key.keys);
        }
      }

      const nextKeys = await chaindata.getNextKeys(validator);

      if (nextKeys) {
        await queries.setValidatorKeys(validator, nextKeys);
      }

      processedValidators++;

      // Calculate progress percentage
      const progress = Math.floor(
        (processedValidators / totalValidators) * 100,
      );

      // Emit progress update event with validator's name
      jobStatusEmitter.emit("jobProgress", {
        name: "Session Key Job",
        progress,
        updated: Date.now(),
        iteration: `Processed validator ${validator}`,
      });
    }

    return true;
  } catch (e) {
    logger.error(`Error running session key job: ${e}`, sessionkeyLabel);
    return false;
  }
};

export const sessionKeyJobWithTiming = withExecutionTimeLogging(
  sessionKeyJob,
  sessionkeyLabel,
  "Session Key Job Done",
);

export const processSessionKeyJob = async (
  job: any,
  metadata: jobsMetadata,
) => {
  logger.info(`Processing Session Key Job....`, sessionkeyLabel);
  await sessionKeyJob(metadata);
};
