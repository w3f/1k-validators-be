import { logger } from "../../..//index";
import { setupCronJob } from "./SetupCronJob";
import { JobConfig, JobRunnerMetadata } from "../JobsClass";

// Functions for starting the cron jobs

export const cronLabel = { label: "Cron" };

export const startJob = async (
  metadata: JobRunnerMetadata,
  jobConfig: JobConfig,
) => {
  const { config } = metadata;
  const {
    jobKey, // Use jobKey instead of separate scheduleKey and enabledKey
    jobFunction,
    name,
    preventOverlap = true,
    defaultFrequency,
  } = jobConfig;

  // Construct enabledKey by appending "Enabled" to jobKey
  const enabledKey = `${jobKey}Enabled`;

  // Ensure the keys exist in config.cron before accessing them
  const isEnabled =
    config.cron &&
    (config.cron[enabledKey as keyof typeof config.cron] as boolean) !==
      undefined;

  const frequency =
    config.cron &&
    (config.cron[jobKey as keyof typeof config.cron] as string) !== undefined
      ? config.cron[jobKey as keyof typeof config.cron].toString()
      : defaultFrequency;

  if (!isEnabled) {
    logger.warn(`${name} is disabled`, cronLabel);
    return;
  }

  await setupCronJob(
    true,
    frequency,
    defaultFrequency,
    () => jobFunction(metadata),
    name,
    cronLabel,
    preventOverlap,
  );
};
