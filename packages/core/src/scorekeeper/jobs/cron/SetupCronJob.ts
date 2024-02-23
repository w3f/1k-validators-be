import { logger } from "@1kv/common";
import { CronJob } from "cron";
import chalk from "chalk";

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

  const coloredJobDescription = chalk.bgYellow(jobDescription);
  const frequency = configFrequency || defaultFrequency;

  const coloredFrequency = chalk.bgYellow(frequency);
  logger.info(
    `Starting ${coloredJobDescription} with frequency ${coloredFrequency}`,
    loggerLabel,
  );

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

    try {
      await jobFunction();
    } catch (e) {
      logger.error(`Error executing ${jobDescription}: ${e}`, loggerLabel);
    } finally {
      isRunning = false;
    }
  });

  cron.start();
};
