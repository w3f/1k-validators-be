import { ApiPromise, WsProvider } from "@polkadot/api";
import { CronJob } from "cron";
import * as fs from "fs";
import path from "path";
import program, { Command } from "commander";

import Database from "./db";
import MatrixBot from "./matrix";
import Monitor from "./monitor";
import Scorekeeper from "./scorekeeper";
import Server from "./server";
import TelemetryClient from "./telemetry";

import logger from "./logger";
import { sleep } from "./util";
import { SIXTEEN_HOURS } from "./constants";

const loadConfig = (configPath: string) => {
  let conf = fs.readFileSync(configPath, { encoding: "utf-8" });
  if (conf.startsWith("'")) {
    conf = conf.slice(1).slice(0, -1);
  }
  return JSON.parse(conf);
};

const loadConfigDir = (configDir: string) => {
  const secretPath = path.join(configDir, "secret.json");
  const secretConf = loadConfig(secretPath);

  const mainPath = path.join(configDir, "main.json");
  const mainConf = loadConfig(mainPath);

  // FIXME: Object.assign overwrites existing properties
  mainConf.matrix.accessToken = secretConf.matrix.accessToken;
  mainConf.scorekeeper.nominators = secretConf.scorekeeper.nominators;

  return mainConf;
};

const createApi = (wsEndpoint: string): Promise<ApiPromise> => {
  return ApiPromise.create({
    provider: new WsProvider(wsEndpoint),
  });
};

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
  logger.info(
    `\nStart-up mem usage ${JSON.stringify(process.memoryUsage())}\n`
  );
  const api = await createApi(config.global.wsEndpoint);
  const db = await Database.create(config.db.mongo.uri);

  const server = new Server(db, config, api);
  server.start();

  const telemetry = new TelemetryClient(config, db);
  telemetry.start();

  logger.info(
    `\nBefore bot mem usage ${JSON.stringify(process.memoryUsage())}\n`
  );
  let maybeBot: any = false;
  if (config.matrix.enabled) {
    const { accessToken, baseUrl, userId } = config.matrix;
    maybeBot = new MatrixBot(baseUrl, accessToken, userId, db, config);
    maybeBot.start();
    maybeBot.sendMessage(`Backend services (re)-started!`);
  }

  /// Buffer some time for set up.
  await sleep(1500);

  logger.info(
    `\nBefore monitor mem usage ${JSON.stringify(process.memoryUsage())}\n`
  );

  /// Monitors the latest GitHub releases and ensures nodes have upgraded
  /// within a timely period.
  const monitor = new Monitor(db, SIXTEEN_HOURS);
  const monitorFrequency = config.global.test
    ? "0 */15 * * * *" // Every 15 minutes.
    : "0 */15 * * * *"; // Every 15 minutes.

  const monitorCron = new CronJob(monitorFrequency, async () => {
    logger.info(
      `Monitoring the node version by polling latst GitHub releases every ${
        config.global.test ? "three" : "fifteen"
      } minutes.`
    );
    await monitor.getLatestTaggedRelease();
    await monitor.ensureUpgrades();
  });
  monitorCron.start();
  await monitor.getLatestTaggedRelease();
  await monitor.ensureUpgrades();

  const sentryMonitor = new CronJob("30 * * * * *", async () => {
    logger.info(
      `\nsentryMonitor mem usage ${JSON.stringify(process.memoryUsage())}\n`
    );
    await monitor.ensureSentryOnline();
  });
  sentryMonitor.start();

  /// Once a week reset the offline accumulations of nodes.
  const clearFrequency = "* * * * * 0";
  const clearCron = new CronJob(clearFrequency, () => {
    db.clearAccumulated();
  });
  clearCron.start();

  const scorekeeper = new Scorekeeper(api, db, config, maybeBot);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  /// Wipe the candidates on every start-up and re-add the ones in config.
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
        let { sentryId } = candidate;
        if (!Array.isArray(sentryId)) {
          sentryId = [sentryId];
        }

        await db.addCandidate(name, stash, sentryId);
      }
    }
  }

  /// Runs right after adding candidates.
  sleep(3000);
  await monitor.ensureSentryOnline();

  logger.info(
    `\nBefore sk mem usage ${JSON.stringify(process.memoryUsage())}\n`
  );

  const scorekeeperFrequency =
    (config.global.test && "0 */15 * * * *") || // 15 mins
    (config.global.dryRun && "0 */5 * * * *") || // 5 mins
    "0 0 0 * * *"; // 24 hours

  scorekeeper.begin(scorekeeperFrequency);
};

program
  .option("--config <directory>", "The path to the config directory.", "config")
  .action((cmd: Command) => catchAndQuit(start(cmd)));

program.version("1.2.5");
program.parse(process.argv);
