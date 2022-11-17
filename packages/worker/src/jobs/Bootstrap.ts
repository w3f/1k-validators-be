import { logger, queries, ChainData, Constants } from "@1kv/common";
import { ConfigSchema } from "@1kv/common/build/config";
import axios from "axios";

export const bootstrapLabel = { label: "Bootstrap" };

export const bootstrapJob = async (config: ConfigSchema) => {
  const start = Date.now();

  const shouldBootstrap = config.global.bootstrap;

  if (!shouldBootstrap) {
    logger.info(`Boostrap: ${shouldBootstrap}. Skipping...`, bootstrapLabel);
    return;
  }

  const bootstrapEndpoint =
    config.global.networkPrefix == 2
      ? config.global.kusamaBootstrapEndpoint
      : config.global.networkPrefix == 0
      ? config.global.polkadotBootstrapEndpoint
      : "";

  try {
    const url = `${bootstrapEndpoint}/candidates`;
    logger.info(url);

    const res = await axios.get(url);

    if (res.data.length > 0) {
      for (const candidate of res.data) {
        logger.info(`bootstrapping: ${candidate.name}...`, bootstrapLabel);
        const {
          name,
          stash,
          discoveredAt,
          nominatedAt,
          offlineSince,
          offlineAccumulated,
          rank,
          faults,
          inclusion,
          location,
          provider,
          democracyVoteCount,
          democracyVotes,
        } = candidate;
        await queries.bootstrapCandidate(
          name,
          stash,
          discoveredAt,
          nominatedAt,
          offlineSince,
          offlineAccumulated,
          rank,
          faults,
          inclusion,
          location,
          provider,
          democracyVoteCount,
          democracyVotes
        );
      }
    }
  } catch (e) {
    logger.warn(`Error trying to get bootstrap data...`, bootstrapLabel);
    logger.warn(e, bootstrapLabel);
  }

  const end = Date.now();

  logger.info(
    `BootstrapJob started at ${new Date(start).toString()} Done. Took ${
      (end - start) / 1000
    } seconds`,
    bootstrapLabel
  );
};

export const processBootstrapJob = async (job: any, config: ConfigSchema) => {
  logger.info(`Processing Bootstrap Job....`, bootstrapLabel);
  await bootstrapJob(config);
};
