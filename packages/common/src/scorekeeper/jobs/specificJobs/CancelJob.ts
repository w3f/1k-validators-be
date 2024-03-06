import { Job, JobConfig, JobRunnerMetadata } from "../JobsClass";
import logger from "../../../logger";
import { Util } from "../../../index";
import { cronLabel } from "../cron/StartCronJobs";

export class CancelJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const cancelJob = async (
  metadata: JobRunnerMetadata,
): Promise<boolean> => {
  try {
    const { config, chaindata, nominatorGroups, bot } = metadata;

    logger.info(`running cancel cron....`, cronLabel);

    const latestBlock = await chaindata.getLatestBlock();
    if (!latestBlock) {
      logger.error(`latest block is null`, cronLabel);
      return false;
    }
    const threshold = latestBlock - 1.2 * config?.proxy?.timeDelayBlocks;

    for (const nom of nominatorGroups) {
      const isProxy = nom.isProxy;
      if (isProxy) {
        const announcements = await chaindata.getProxyAnnouncements(
          nom.address,
        );

        for (const announcement of announcements) {
          // If there are any specific announcements to cancel, try to cancel them,
          //     so long as they are registered on chain
          const blacklistedAnnouncements =
            config?.proxy?.blacklistedAnnouncements;
          if (blacklistedAnnouncements) {
            for (const blacklistedAnnouncement of blacklistedAnnouncements) {
              logger.info(
                `there is a blacklisted announcement to cancel: ${blacklistedAnnouncement}`,
                cronLabel,
              );
              if (bot) {
                // await bot.sendMessage(
                //   `{CancelCron::cancel} there is a blacklisted announcement to cancel: ${blacklistedAnnouncement}`
                // );
              }

              // If the blacklisted announcement matches what's registered on chain, cancel it
              if (announcement.callHash == blacklistedAnnouncement) {
                logger.info(
                  `cancelling ${announcement.callHash} - ${blacklistedAnnouncement}`,
                );
                const didCancel = await nom.cancelTx(announcement);
                if (didCancel) {
                  const successfulCancelMessage = `{CancelCron::cancel} ${blacklistedAnnouncement} was successfully cancelled.`;
                  logger.info(successfulCancelMessage);
                  // await bot.sendMessage(successfulCancelMessage);
                }
              } else {
                logger.info(
                  `announcement call hash: ${announcement.callHash} does not match ${blacklistedAnnouncement}`,
                );
              }
            }
          }

          // if it is too old, cancel it
          if (announcement.height < threshold) {
            await Util.sleep(10000);
            logger.info(
              `announcement at ${announcement.height} is older than threshold: ${threshold}. Cancelling...`,
              cronLabel,
            );
            const didCancel = await nom.cancelTx(announcement);
            if (didCancel) {
              logger.info(
                `announcement from ${announcement.real} at ${announcement.height} was older than ${threshold} and has been cancelled`,
                cronLabel,
              );
              if (bot) {
                await bot.sendMessage(
                  `Proxy announcement from ${Util.addressUrl(
                    announcement.real,
                    config,
                  )} at #${
                    announcement.height
                  } was older than #${threshold} and has been cancelled`,
                );
              }
            }
            await Util.sleep(10000);
          }
        }
      }
    }
    return true;
  } catch (e) {
    logger.error(`cancelJob error: ${e}`, cronLabel);
    return false;
  }
};
