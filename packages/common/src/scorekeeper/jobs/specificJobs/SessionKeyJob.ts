import { logger, queries } from "../../../index";
import { Job, JobConfig, JobRunnerMetadata, JobStatus } from "../JobsClass";
import { jobStatusEmitter } from "../../../Events";
import { withExecutionTimeLogging } from "../../../utils";
import { JobNames } from "../JobConfigs";

export const sessionkeyLabel = { label: "SessionKeyJob" };

export class SessionKeyJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const sessionKeyJob = async (metadata: JobRunnerMetadata) => {
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
        name: JobNames.SessionKey,
        progress,
        updated: Date.now(),
        iteration: `Processed validator ${validator}`,
      });
    }

    return true;
  } catch (e) {
    logger.error(`Error running session key job: ${e}`, sessionkeyLabel);
    const errorStatus: JobStatus = {
      status: "errored",
      name: JobNames.SessionKey,
      updated: Date.now(),
      error: JSON.stringify(e),
    };

    jobStatusEmitter.emit("jobErrored", errorStatus);
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
  metadata: JobRunnerMetadata,
) => {
  logger.info(`Processing Session Key Job....`, sessionkeyLabel);
  await sessionKeyJob(metadata);
};
