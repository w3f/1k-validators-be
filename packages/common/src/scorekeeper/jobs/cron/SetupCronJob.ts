import { CronJob } from "cron";
import { logger } from "../../../index";
import { jobStatusEmitter } from "../../../Events";
import { JobStatus } from "../JobsClass";

type JobFunction = () => Promise<void> | void;
export const setupCronJob = async (
  enabled: boolean, // Whether the cron job is enabled
  configFrequency: string | undefined, // Frequency from config
  defaultFrequency: string, // Default frequency
  jobFunction: JobFunction, // Job function to execute
  name: string, // Description for logging
  loggerLabel: { label: string }, // Optional logging label
  preventOverlap = false, // Optional flag to prevent overlapping executions
): Promise<void> => {
  if (!enabled) {
    logger.warn(`${name} is disabled.`, loggerLabel);
    return;
  }

  let jobRunCount = 0;
  const frequency = configFrequency || defaultFrequency;
  logger.info(`Starting ${name} with frequency ${frequency}`, loggerLabel);
  const startedStatus: JobStatus = {
    status: "started",
    frequency: frequency,
    name: name,
    runCount: jobRunCount,
    updated: Date.now(),
  };
  jobStatusEmitter.emit("jobStarted", startedStatus);

  let isRunning = false;

  const cron = new CronJob(frequency, async () => {
    if (preventOverlap && isRunning) {
      logger.info(`Skipped ${name} execution due to overlap.`, loggerLabel);
      return;
    }

    isRunning = true;
    logger.info(`Executing ${name}.`, loggerLabel);
    const runningStatus: JobStatus = {
      status: "running",
      name: name,
      runCount: jobRunCount,
      updated: Date.now(),
    };
    jobStatusEmitter.emit("jobRunning", runningStatus);

    try {
      await jobFunction();
    } catch (e) {
      logger.error(`Error executing ${name}: ${e}`, loggerLabel);
      const errorStatus: JobStatus = {
        status: "errored",
        name: name,
        runCount: jobRunCount,
        updated: Date.now(),
        error: JSON.stringify(e),
      };

      jobStatusEmitter.emit("jobErrored", errorStatus);
    } finally {
      isRunning = false;
      jobRunCount++;
      const finishedStatus: JobStatus = {
        status: "finished",
        name: name,
        runCount: jobRunCount,
        updated: Date.now(),
      };
      jobStatusEmitter.emit("jobFinished", finishedStatus);
    }
  });

  cron.start();
};
