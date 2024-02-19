import { Command } from "commander";

import {
  ApiHandler,
  Config,
  Constants,
  Db,
  logger,
  queries,
  Util,
} from "@1kv/common";
import MatrixBot from "./matrix";
import Scorekeeper from "./scorekeeper/scorekeeper";
import { TelemetryClient } from "@1kv/telemetry";
import { startTestSetup } from "./misc/testSetup";

import { startClearAccumulatedOfflineTimeJob } from "./scorekeeper/jobs/cron/cron";
import { Server } from "@1kv/gateway";

const isCI = process.env.CI;

const version = process.env.npm_package_version || "v2.8.54";

const winstonLabel = { label: "start" };

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const createAPIHandler = async (config, retries = 0) => {
  try {
    logger.info(`Creating API Handler`, winstonLabel);
    // Create the API handler.
    const endpoints =
      config.global.networkPrefix == 2
        ? config.global.apiEndpoints
        : config.global.networkPrefix == 0
          ? config.global.apiEndpoints
          : Constants.LocalEndpoints;
    const handler = new ApiHandler(endpoints);
    await handler.setAPI();
    return handler;
  } catch (e) {
    logger.error(e.toString(), winstonLabel);
    if (retries < 20) {
      logger.info(`Retrying... attempt: ${retries}`, winstonLabel);
      return await createAPIHandler(config, retries + 1);
    } else {
      logger.error(`Retries exceeded`, winstonLabel);
      process.exit(1);
    }
  }
};

export const createDB = async (config) => {
  try {
    logger.info(`Creating DB Connection`, winstonLabel);
    await Db.create(config.db.mongo.uri);
    logger.info(`Connected to ${config.db.mongo.uri}`, winstonLabel);
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const createServer = async (config) => {
  try {
    logger.info(`Creating Server`, winstonLabel);
    const server = new Server(config);
    await server.start();
    logger.info(`Server started at: ${config?.server?.port}`, winstonLabel);
  } catch (e) {
    logger.error(e.toString());
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
    logger.error(e.toString());
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
    logger.error(e.toString());
    process.exit(1);
  }
};

export const initLocalDevScript = async (config) => {
  logger.info(`Checking if chain is a test chain...`, winstonLabel);
  try {
    const chainMetadata = await queries.getChainMetadata();
    // If the chain is a test chain, init some test chain conditions
    if (config.global.networkPrefix === 3 && !chainMetadata) {
      logger.info(
        `chain index is ${config.global.networkPrefix}, starting init script...`,
        winstonLabel,
      );
      await startTestSetup();
      await Util.sleep(1500);
      logger.info(
        `init script done ----------------------------------------------------`,
        winstonLabel,
      );
      await Util.sleep(15000);
    }
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const clean = async (scorekeeper) => {
  try {
    // Clean locations with None
    await queries.cleanBlankLocations();

    // Delete all on-chain identities so they get fetched new on startup.
    await queries.deleteAllIdentities();

    // Delete the old candidate fields.
    await queries.deleteOldCandidateFields();

    // Clear node refs and delete old fields from all nodes before starting new
    // telemetry client.
    const allNodes = await queries.allNodes();
    for (const [index, node] of allNodes.entries()) {
      const { name } = node;
      await queries.deleteOldFieldFrom(name);
      await queries.clearNodeRefsFrom(name);
    }

    // Remove stale nominators.
    const bondedAddresses = scorekeeper.getAllNominatorBondedAddresses();
    await queries.removeStaleNominators(bondedAddresses);

    // Wipe the candidates
    logger.info(
      "Wiping old candidates data and initializing latest candidates from config.",
      winstonLabel,
    );
    await queries.clearCandidates();
    await queries.deleteOldValidatorScores();

    await findDuplicates();

    logger.info(`Cleaning finished`, winstonLabel);
  } catch (e) {
    logger.error(e.toString());
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

export const addRewardClaimer = async (config, scorekeeper) => {
  try {
    if (config.scorekeeper.claimer) {
      logger.info(`Claimer in config. Adding to scorekeeper`, winstonLabel);
      // Setup claimer in the scorekeeper
      await scorekeeper.addClaimer(config.scorekeeper.claimer);
    }
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const addCandidates = async (config) => {
  try {
    if (config.scorekeeper.candidates.length) {
      for (const candidate of config.scorekeeper.candidates) {
        if (candidate === null) {
          continue;
        } else {
          const { name, stash, riotHandle } = candidate;
          const kusamaStash = candidate.kusamaStash || "";
          const skipSelfStake = candidate.skipSelfStake || false;
          const id = candidate.slotId || "";
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
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const setChainMetadata = async (config) => {
  try {
    logger.info(`Setting chain metadata`, winstonLabel);
    await queries.setChainMetadata(config.global.networkPrefix);
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

export const initScorekeeper = async (config, handler, maybeBot) => {
  try {
    logger.info(`Creating Scorekeeper`, winstonLabel);
    // Set up the nominators in the scorekeeper.
    const scorekeeper = new Scorekeeper(handler, config, maybeBot);
    for (const nominatorGroup of config.scorekeeper.nominators) {
      await scorekeeper.addNominatorGroup(nominatorGroup);
    }
    return scorekeeper;
  } catch (e) {
    logger.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  const config = await Config.loadConfigDir(cmd.config);
  const winstonLabel = { label: "start" };

  logger.info(`Starting the backend services. ${version}`, winstonLabel);
  logger.info(`Network prefix: ${config.global.networkPrefix}`, winstonLabel);

  const handler = await createAPIHandler(config);

  // Create the Database.
  await createDB(config);

  // Init some on chain conditions if test chain
  await initLocalDevScript(config);

  // Set the chain metadata
  await setChainMetadata(config);

  // Create the matrix bot if enabled.
  const maybeBot = await createMatrixBot(config);

  // Start the clear accumulated offline time job.
  await startClearAccumulatedOfflineTimeJob(config);

  const api = handler.getApi();
  while (!api) {
    logger.info(`Waiting for API to connect...`, winstonLabel);
    await Util.sleep(1000);
  }

  // Create the scorekeeper.
  const scorekeeper = await initScorekeeper(config, handler, maybeBot);

  // Clean the DB.
  await clean(scorekeeper);

  // await addRewardClaimer(config, scorekeeper);

  // Add the candidates
  await addCandidates(config);

  // Start the API server.
  await createServer(config);

  // Start the telemetry client.
  await createTelemetry(config);

  // Start the scorekeeper
  await scorekeeper.begin();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
