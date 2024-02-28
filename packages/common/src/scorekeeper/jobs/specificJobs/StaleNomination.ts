import { Job, JobConfig, JobRunnerMetadata } from "../JobsClass";
import logger from "../../../logger";
import { Constants, queries } from "../../../index";
import { CronJob } from "cron";
import { cronLabel } from "../cron/StartCronJobs";

export class StaleNominationJob extends Job {
  constructor(jobConfig: JobConfig, jobRunnerMetadata: JobRunnerMetadata) {
    super(jobConfig, jobRunnerMetadata);
  }
}

export const staleNominationJob = async (
  metadata: JobRunnerMetadata,
): Promise<void> => {
  const {
    constraints,
    ending,
    config,
    chaindata,
    nominatorGroups,
    nominating,
    currentEra,
    bot,
    handler,
  } = metadata;

  const staleFrequency = config.cron?.stale ?? Constants.STALE_CRON;

  logger.info(
    `Running stale nomination cron with frequency: ${staleFrequency}`,
    cronLabel,
  );
  const api = handler.getApi();

  if (!api) {
    logger.error(`api is null`, cronLabel);
    return;
  }

  // threshold for a stale nomination - 8 eras for kusama, 2 eras for polkadot
  const threshold = config.global.networkPrefix == 2 ? 8 : 2;
  const staleCron = new CronJob(staleFrequency, async () => {
    logger.info(`running stale cron....`, cronLabel);

    const currentEra = await api.query.staking.currentEra();
    const allCandidates = await queries.allCandidates();

    for (const nom of nominatorGroups) {
      const stash = await nom.stash();
      if (!stash || stash === "0x") continue;

      const nominators = await api.query.staking.nominators(stash);
      const nominatorsJson = nominators.toJSON() as {
        submittedIn?: number;
        targets?: string[];
      };

      if (!nominatorsJson || nominatorsJson === null) continue;

      const submittedIn: number = nominatorsJson.submittedIn ?? 0;
      const targets: string[] = nominatorsJson.targets ?? [];

      for (const target of targets) {
        const isCandidate = allCandidates.filter(
          (candidate) => candidate.stash == target,
        );

        if (isCandidate.length === 0) {
          const message = `Nominator ${stash} is nominating ${target}, which is not a 1kv candidate`;
          logger.info(message);
          if (bot) {
            await bot.sendMessage(message);
          }
        }
      }

      if (submittedIn < Number(currentEra) - threshold) {
        const message = `Nominator ${stash} has a stale nomination. Last nomination was in era ${submittedIn} (it is now era ${currentEra})`;
        logger.info(message, cronLabel);
        if (bot) {
          await bot.sendMessage(message);
        }
      }
    }
  });

  staleCron.start();
};
