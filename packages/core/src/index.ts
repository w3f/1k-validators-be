import { Command } from "commander";

import {
  ApiHandler,
  Types,
  Config,
  Constants,
  Db,
  logger,
  MatrixBot,
  queries,
  ScoreKeeper,
  Util,
  ChainData,
} from "@1kv/common";
import { Server } from "@1kv/gateway";
import { TelemetryClient } from "@1kv/telemetry";
import { ConfigSchema } from "@1kv/common/build/config";

const isCI = process.env.CI;

const version = process.env.npm_package_version || "v2.8.54";

const winstonLabel = { label: "start" };

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const createAPIHandlers = async (
  config: ConfigSchema,
): Promise<Types.ApiHandlers> => {
  logger.info("Creating API Handler", winstonLabel);
  // Determine the correct set of endpoints based on the network prefix.
  const endpoints =
    config.global.networkPrefix === 2 || config.global.networkPrefix === 0
      ? config.global.apiEndpoints
      : Constants.LocalEndpoints;

  const relayHandler = new ApiHandler(endpoints);

  const peopleHandler = config.global.apiPeopleEndpoints
    ? new ApiHandler(config.global.apiPeopleEndpoints)
    : relayHandler;

  return { relay: relayHandler, people: peopleHandler };
};

export const createDB = async (config) => {
  try {
    logger.info(`Creating DB Connection`, winstonLabel);
    await Db.create(config.db.mongo.uri);
    logger.info(`Connected to ${config.db.mongo.uri}`, winstonLabel);
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const createServer = async (config, handler?, scorekeeper?) => {
  try {
    logger.info(`Creating Server`, winstonLabel);
    const server = new Server(config, handler, scorekeeper);
    const didStart = await server.start();
    if (didStart) {
      logger.info(
        `Server started with registered routes at: ${config?.server?.port}`,
        winstonLabel,
      );
    }
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const createTelemetry = async (config) => {
  try {
    // Start the telemetry client.
    logger.info(`Starting telemetry client...`, winstonLabel);
    const telemetry = new TelemetryClient(config);
    await telemetry.start();
    logger.info(`Telemetry client started.`, winstonLabel);
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const createMatrixBot = async (config) => {
  try {
    // Create the matrix bot if enabled.
    let maybeBot: any = false;
    if (config.matrix.enabled && !isCI) {
      const { accessToken, baseUrl, userId } = config.matrix;
      maybeBot = new MatrixBot(baseUrl, accessToken, userId, config);
      await maybeBot.start();
      await maybeBot.sendMessage(
        `<a href="https://github.com/w3f/1k-validators-be">Backend services</a> (re)-started! Version: ${version}`,
      );
    }
    logger.info(`matrix client started.`, winstonLabel);
    return maybeBot;
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const clean = async (scorekeeper: ScoreKeeper) => {
  try {
    await Util.cleanDB(scorekeeper);
    await findDuplicates();

    logger.info(`Cleaning finished`, winstonLabel);
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const findDuplicates = async () => {
  const nameDuplicates = await queries.getDuplicatesByName();
  if (nameDuplicates.length > 0) {
    logger.warn("Found Duplicates with multiple names", winstonLabel);
    logger.warn(JSON.stringify(nameDuplicates), winstonLabel);
  }

  const stashDuplicates = await queries.getDuplicatesByStash();
  if (stashDuplicates.length > 0) {
    logger.warn("Found Duplicates with multiple stashes", winstonLabel);
    logger.warn(JSON.stringify(stashDuplicates), winstonLabel);
  }
};

// Adds candidates from the db, and removes all candidates that are not in the config
export const addCleanCandidates = async (config: Config.ConfigSchema) => {
  try {
    // For all nodes, set their stash address to null
    await queries.clearCandidates();

    // Populate candidates and their stashes only from whats in the config files
    if (config.scorekeeper.candidates.length) {
      for (const candidate of config.scorekeeper.candidates) {
        if (candidate === null) {
          continue;
        } else {
          const { name, stash, riotHandle } = candidate;
          const kusamaStash = candidate.kusamaStash || "";
          const skipSelfStake = candidate.skipSelfStake || false;
          const id = candidate.slotId;
          const kyc = candidate.kyc || false;
          await queries.addCandidate(
            id,
            name,
            stash,
            kusamaStash,
            skipSelfStake,
            riotHandle,
            kyc,
          );
        }
      }
    }

    // Remove any candidate in the db that doesn't have a stash or slotId
    await queries.deleteCandidatesWithMissingFields();
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const setChainMetadata = async (config) => {
  try {
    logger.info(`Setting chain metadata`, winstonLabel);
    await queries.setChainMetadata(config.global.networkPrefix);
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

export const initScorekeeper = async (
  config: ConfigSchema,
  chaindata: ChainData,
  maybeBot: any,
) => {
  try {
    logger.info(`Creating Scorekeeper`, winstonLabel);
    // Set up the nominators in the scorekeeper.
    const scorekeeper = new ScoreKeeper(chaindata, config, maybeBot);
    for (const nominatorGroup of config.scorekeeper.nominators) {
      await scorekeeper.addNominatorGroup(nominatorGroup);
    }
    return scorekeeper;
  } catch (e) {
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  try {
    const config = await Config.loadConfigDir(cmd.config);
    const winstonLabel = { label: "start" };

    logger.info(`Starting the backend services. ${version}`, winstonLabel);
    logger.info(`Network prefix: ${config.global.networkPrefix}`, winstonLabel);

    const apiHandlers = await createAPIHandlers(config);

    // Create the Database.
    await createDB(config);

    // Set the chain metadata
    await setChainMetadata(config);

    // Create the matrix bot if enabled.
    const maybeBot = await createMatrixBot(config);

    await apiHandlers.relay.getApi();
    await apiHandlers.people.getApi();

    const chaindata = new ChainData(apiHandlers);

    // Create the scorekeeper.
    const scorekeeper = await initScorekeeper(config, chaindata, maybeBot);

    // Clean the DB.
    await clean(scorekeeper);

    // Add the candidates
    await addCleanCandidates(config);

    // Start the API server.
    await createServer(config, apiHandlers, scorekeeper);

    // Start the telemetry client.
    await createTelemetry(config);

    // Start the scorekeeper
    await scorekeeper.begin();
  } catch (e) {
    logger.error(`Error starting backend services`, winstonLabel);
    logger.error(JSON.stringify(e));
    process.exit(1);
  }
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);

process.on("uncaughtException", (error) => {
  logger.error(error.toString());
  process.exit(1);
});
