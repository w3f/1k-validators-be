import { CronJob } from "cron";
import { Command } from "commander";

import ApiHandler from "./ApiHandler";
import { loadConfigDir } from "./config";
import {
  SIXTEEN_HOURS,
  KusamaEndpoints,
  PolkadotEndpoints,
  LocalEndpoints,
} from "./constants";
import Database from "./db";
import logger from "./logger";
import MatrixBot from "./matrix";
import Monitor from "./monitor";
import Scorekeeper from "./scorekeeper";
import Server from "./server";
import TelemetryClient from "./telemetry";
import { sleep } from "./util";
import { startTestSetup } from "./misc/testSetup";
import { writeHistoricNominations } from "./misc/historicNominations";

import { retroactiveRanks } from "./misc/retroactive";
import { startClearAccumulatedOfflineTimeJob, startMonitorJob } from "./cron";

const isCI = process.env.CI;

const version = "v2.5.31";

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  const config = loadConfigDir(cmd.config);

  logger.info(`{Start} Starting the backend services.`);

  logger.info(`{Start} Network prefix: ${config.global.networkPrefix}`);

  // Create the API handler.
  const endpoints =
    config.global.networkPrefix == 2
      ? KusamaEndpoints
      : config.global.networkPrefix == 0
      ? PolkadotEndpoints
      : LocalEndpoints;
  const handler = await ApiHandler.create(endpoints);

  // Create the Database.
  const db = await Database.create(config.db.mongo.uri);

  const chainMetadata = await db.getChainMetadata();

  // If the chain is a test chain, init some test chain conditions
  if (config.global.networkPrefix === 3 && !chainMetadata) {
    logger.info(
      `{Start::testSetup} chain index is ${config.global.networkPrefix}, starting init script...`
    );
    await startTestSetup();
    await sleep(1500);
    logger.info(
      `{Start::testSetup} init script done ----------------------------------------------------`
    );
    await sleep(15000);
  }

  await db.setChainMetadata(config.global.networkPrefix, handler);

  // Delete the old candidate fields.
  await db.deleteOldCandidateFields();

  // Clear node refs and delete old fields from all nodes before starting new
  // telemetry client.
  const allNodes = await db.allNodes();
  for (const node of allNodes) {
    const { name } = node;
    await db.deleteOldFieldFrom(name);
    await db.clearNodeRefsFrom(name);
  }

  // Start the telemetry client.
  const telemetry = new TelemetryClient(config, db);
  telemetry.start();

  // Create the matrix bot if enabled.
  let maybeBot: any = false;
  if (config.matrix.enabled && !isCI) {
    const { accessToken, baseUrl, userId } = config.matrix;
    maybeBot = new MatrixBot(baseUrl, accessToken, userId, db, config);
    maybeBot.start();
    maybeBot.sendMessage(
      `<a href="https://github.com/w3f/1k-validators-be">Backend services</a> (re)-started! Version: ${version}`
    );
  }

  // Buffer some time for set up.
  await sleep(1500);

  await startClearAccumulatedOfflineTimeJob(config, db);

  // Set up the nominators in the scorekeeper.
  const scorekeeper = new Scorekeeper(handler, db, config, maybeBot);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  if (config.scorekeeper.claimer) {
    logger.info(`Claimer in config. Adding to scorekeeper`);
    // Setup claimer in the scorekeeper
    await scorekeeper.addClaimer(config.scorekeeper.claimer);
  }

  const curControllers = scorekeeper.getAllNominatorControllers();
  await db.removeStaleNominators(curControllers);

  // Wipe the candidates on every start-up and re-add the ones in config.
  logger.info(
    "{Start} Wiping old candidates data and intializing latest candidates from config."
  );
  await db.clearCandidates();
  if (config.scorekeeper.candidates.length) {
    for (const candidate of config.scorekeeper.candidates) {
      if (candidate === null) {
        continue;
      } else {
        const { name, stash } = candidate;
        const bio = candidate.bio || "";
        // Polkadot only options.
        const kusamaStash = candidate.kusamaStash || "";
        const skipSelfStake = candidate.skipSelfStake || false;

        await db.addCandidate(name, stash, kusamaStash, skipSelfStake, bio);
      }
    }
  }

  // Buffer more time.
  sleep(3000);

  // Start the scorekeeper
  scorekeeper.begin();

  if (config.global.historicalNominations && !isCI) {
    writeHistoricNominations(handler, db);
  }

  // Start the API server.
  const server = new Server(db, config, scorekeeper);
  server.start();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);
