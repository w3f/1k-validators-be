import { CronJob } from "cron";
import { Command } from "commander";

import {
  ApiHandler,
  Constants,
  logger,
  Util,
  Db,
  Config,
  queries,
} from "@1kv/common";
import MatrixBot from "./matrix";
import Monitor from "./monitor";
import Scorekeeper from "./scorekeeper";
import { Server } from "@1kv/gateway";
import { TelemetryClient } from "@1kv/telemetry";
import { startTestSetup } from "./misc/testSetup";

import { startClearAccumulatedOfflineTimeJob, startMonitorJob } from "./cron";

const isCI = process.env.CI;

const version = process.env.npm_package_version || "v2.6.98";

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: { config: string }) => {
  const config = Config.loadConfigDir(cmd.config);

  logger.info(`{Core:Start} Starting the backend services. ${version}`);

  logger.info(`{Start} Network prefix: ${config.global.networkPrefix}`);

  // Create the API handler.
  const endpoints =
    config.global.networkPrefix == 2
      ? Constants.KusamaEndpoints
      : config.global.networkPrefix == 0
      ? Constants.PolkadotEndpoints
      : Constants.LocalEndpoints;
  const handler = await ApiHandler.create(endpoints);

  // Create the Database.
  logger.info(`Creating DB Connection`);
  const db = await Db.create(config.db.mongo.uri);

  // Start the API server.
  logger.info(`Creating Server`);
  const server = new Server(config);
  await server.start();

  const chainMetadata = await queries.getChainMetadata();

  // If the chain is a test chain, init some test chain conditions
  if (config.global.networkPrefix === 3 && !chainMetadata) {
    logger.info(
      `{Start::testSetup} chain index is ${config.global.networkPrefix}, starting init script...`
    );
    await startTestSetup();
    await Util.sleep(1500);
    logger.info(
      `{Start::testSetup} init script done ----------------------------------------------------`
    );
    await Util.sleep(15000);
  }

  await queries.setChainMetadata(config.global.networkPrefix);

  // Delete the old candidate fields.
  await queries.deleteOldCandidateFields();

  // Clear node refs and delete old fields from all nodes before starting new
  // telemetry client.
  const allNodes = await queries.allNodes();
  for (const node of allNodes) {
    const { name } = node;
    await queries.deleteOldFieldFrom(name);
    await queries.clearNodeRefsFrom(name);
  }

  // Start the telemetry client.
  const telemetry = new TelemetryClient(config);
  await telemetry.start();

  // Create the matrix bot if enabled.
  let maybeBot: any = false;
  if (config.matrix.enabled && !isCI) {
    const { accessToken, baseUrl, userId } = config.matrix;
    maybeBot = new MatrixBot(baseUrl, accessToken, userId, config);
    maybeBot.start();
    await maybeBot.sendMessage(
      `<a href="https://github.com/w3f/1k-validators-be">Backend services</a> (re)-started! Version: ${version}`
    );
  }

  // Buffer some time for set up.
  await Util.sleep(1500);

  await startClearAccumulatedOfflineTimeJob(config);

  // Set up the nominators in the scorekeeper.
  const scorekeeper = new Scorekeeper(handler, config, maybeBot);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  if (config.scorekeeper.claimer) {
    logger.info(`Claimer in config. Adding to scorekeeper`);
    // Setup claimer in the scorekeeper
    await scorekeeper.addClaimer(config.scorekeeper.claimer);
  }

  const curControllers = scorekeeper.getAllNominatorControllers();
  await queries.removeStaleNominators(curControllers);

  // Wipe the candidates on every start-up and re-add the ones in config.
  logger.info(
    "{Start} Wiping old candidates data and intializing latest candidates from config."
  );
  await queries.clearCandidates();
  if (config.scorekeeper.candidates.length) {
    for (const candidate of config.scorekeeper.candidates) {
      if (candidate === null) {
        continue;
      } else {
        const { name, stash, riotHandle } = candidate;
        const bio = candidate.bio || "";
        // Polkadot only options.
        const kusamaStash = candidate.kusamaStash || "";
        const skipSelfStake = candidate.skipSelfStake || false;
        await queries.addCandidate(
          name,
          stash,
          kusamaStash,
          skipSelfStake,
          bio,
          riotHandle
        );
      }
    }
  }

  // Buffer more time.
  Util.sleep(3000);

  // Start the scorekeeper
  scorekeeper.begin();
};

const program = new Command();

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: { config: string }) => catchAndQuit(start(cmd)));

program.version(version);
program.parse(process.argv);

const signals = ["SIGHUP", "SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, () => {
    logger.info(`process received a ${signal} signal`);
  });
}
