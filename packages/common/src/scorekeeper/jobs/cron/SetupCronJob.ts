import { CronJob } from "cron";
import { logger } from "../../../index";
import { jobStatusEmitter } from "../../../Events";

type JobFunction = () => Promise<void> | void;
export const setupCronJob = async (
  enabled: boolean, // Whether the cron job is enabled
  configFrequency: string | undefined, // Frequency from config
  defaultFrequency: string, // Default frequency
  jobFunction: JobFunction, // Job function to execute
  jobDescription: string, // Description for logging
  loggerLabel, // Optional logging label
  preventOverlap = false, // Optional flag to prevent overlapping executions
): Promise<void> => {
  if (!enabled) {
    logger.warn(`${jobDescription} is disabled.`, loggerLabel);
    return;
  }

  let jobRunCount = 0;
  const frequency = configFrequency || defaultFrequency;
  logger.info(
    `Starting ${jobDescription} with frequency ${frequency}`,
    loggerLabel,
  );
  jobStatusEmitter.emit("jobStarted", {
    name: jobDescription,
    runCount: jobRunCount,
    updated: Date.now(),
  });

  let isRunning = false;

  const cron = new CronJob(frequency, async () => {
    if (preventOverlap && isRunning) {
      logger.info(
        `Skipped ${jobDescription} execution due to overlap.`,
        loggerLabel,
      );
      return;
    }

    isRunning = true;
    logger.info(`Executing ${jobDescription}.`, loggerLabel);
    jobStatusEmitter.emit("jobRunning", {
      name: jobDescription,
      runCount: jobRunCount,
      updated: Date.now(),
    });

    try {
      await jobFunction();
    } catch (e) {
      logger.error(`Error executing ${jobDescription}: ${e}`, loggerLabel);
      jobStatusEmitter.emit("jobErrored", {
        name: jobDescription,
        runCount: jobRunCount,
        updated: Date.now(),
        error: JSON.stringify(e),
      });
    } finally {
      isRunning = false;
      jobRunCount++;
      jobStatusEmitter.emit("jobFinished", {
        name: jobDescription,
        runCount: jobRunCount,
        updated: Date.now(),
      });
    }
  });

  await cron.start();
};
