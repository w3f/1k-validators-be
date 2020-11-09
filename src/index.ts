import { CronJob } from "cron";
import program, { Command } from "commander";

import ApiHandler from "./ApiHandler";
import { loadConfigDir } from "./config";
import { SIXTEEN_HOURS, KusamaEndpoints, PolkadotEndpoints } from "./constants";
import Database from "./db";
import logger from "./logger";
import MatrixBot from "./matrix";
import Monitor from "./monitor";
import Scorekeeper from "./scorekeeper";
import Server from "./server";
import TelemetryClient from "./telemetry";
import { sleep } from "./util";

const catchAndQuit = async (fn: any) => {
  try {
    await fn;
  } catch (e) {
    console.error(e.toString());
    process.exit(1);
  }
};

const start = async (cmd: Command) => {
  const config = loadConfigDir(cmd.config);

  logger.info(`Starting the backend services.`);

  // Create the API handler.
  const endpoints =
    config.global.networkPrefix == 2 ? KusamaEndpoints : PolkadotEndpoints;
  const handler = await ApiHandler.create(endpoints);

  // Create the Database.
  const db = await Database.create(config.db.mongo.uri);
  // TMP - just need to run this once
  await db.deleteOldCandidateFields();
  // TMP

  // Start the telemetry client.
  const telemetry = new TelemetryClient(config, db);
  telemetry.start();

  // Create the matrix bot if enabled.
  let maybeBot: any = false;
  if (config.matrix.enabled) {
    const { accessToken, baseUrl, userId } = config.matrix;
    maybeBot = new MatrixBot(baseUrl, accessToken, userId, db, config);
    maybeBot.start();
    maybeBot.sendMessage(`Backend services (re)-started!`);
  }

  // Buffer some time for set up.
  await sleep(1500);

  // Monitors the latest GitHub releases and ensures nodes have upgraded
  // within a timely period.
  const monitor = new Monitor(db, SIXTEEN_HOURS);
  const monitorFrequency = "0 */15 * * * *"; // Every 15 minutes.

  const monitorCron = new CronJob(monitorFrequency, async () => {
    logger.info(
      `Monitoring the node version by polling latst GitHub releases every ${
        config.global.test ? "three" : "fifteen"
      } minutes.`
    );
    await monitor.getLatestTaggedRelease();
    await monitor.ensureUpgrades();
  });

  await monitor.getLatestTaggedRelease();
  await monitor.ensureUpgrades();
  monitorCron.start();

  // Once a week reset the offline accumulations of nodes.
  const clearFrequency = "* * * * * 0";
  const clearCron = new CronJob(clearFrequency, () => {
    db.clearAccumulated();
  });
  clearCron.start();

  // Set up the nominators in the scorekeeper.
  const scorekeeper = new Scorekeeper(handler, db, config, maybeBot);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  // Wipe the candidates on every start-up and re-add the ones in config.
  logger.info(
    "Wiping old candidates data and intializing latest candidates from config."
  );
  await db.clearCandidates();
  if (config.scorekeeper.candidates.length) {
    for (const candidate of config.scorekeeper.candidates) {
      if (candidate === null) {
        continue;
      } else {
        const { name, stash } = candidate;

        await db.addCandidate(name, stash);
      }
    }
  }

  // Buffer more time.
  sleep(3000);

  // Start the scorekeeper
  const scorekeeperFrequency =
    (config.global.test && "0 */15 * * * *") || // 15 mins
    (config.global.dryRun && "0 */5 * * * *") || // 5 mins
    "0 0 0 * * *"; // 24 hours

  scorekeeper.begin(scorekeeperFrequency);

  // Start the API server.
  const server = new Server(db, config, scorekeeper);
  server.start();
};

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: Command) => catchAndQuit(start(cmd)));

program.version("1.4.30");
program.parse(process.argv);
