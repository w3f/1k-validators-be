import { ApiPromise, WsProvider } from '@polkadot/api';
import { CronJob, CronTime } from 'cron';
import * as fs from 'fs';
import program, { Command } from 'commander';

import Database from './db';
import MatrixBot from './matrix';
import Monitor from './monitor';
import Scorekeeper from './scorekeeper';
import Server from './server';
import TelemetryClient from './telemetry';

import logger from './logger';
import { sleep } from './util';
import { SIXTEEN_HOURS } from './constants';

const loadConfig = (configPath: string) => {
  let conf = fs.readFileSync(configPath, { encoding: 'utf-8' });
  if (conf.startsWith("'")) {
    conf = conf.slice(1).slice(0,-1);
  }
  return JSON.parse(conf);
}

const createApi = (wsEndpoint: string): Promise<ApiPromise> => {
  return ApiPromise.create({
    provider: new WsProvider(wsEndpoint),
  });
}

const start = async (cmd: Command) => {
  const config = loadConfig(cmd.config);

  logger.info(`Starting the backend services.`);
  const api = await createApi(config.global.wsEndpoint);
  const db = new Database(config.db.storageFile);
  const server = new Server(db, config.server.port);
  server.start();

  const telemetry = new TelemetryClient(config, db);
  telemetry.start();

  let maybeBot: any = false;
  if (config.matrix.enabled) {
    const { accessToken, baseUrl, userId } = config.matrix;
    maybeBot = new MatrixBot(baseUrl, accessToken, userId, db, config);
    maybeBot.start();
    maybeBot.sendMessage(`Backend services (re)-started!`);
  }

  /// Buffer some time for set up.
  await sleep(1500);

  /// Monitors the latest GitHub releases and ensures nodes have upgraded
  /// within a timely period.
  const monitor = new Monitor(db, SIXTEEN_HOURS);
  const monitorFrequency = config.global.test
    ? '0 0-59/3 * * * *'    // Every 3 minutes.
    : '0 0-59/15 * * * *';  // Every 15 minutes.

  const monitorCron = new CronJob(monitorFrequency, async () => {
    logger.info(`Monitoring the node version by polling latst GitHub releases every ${config.global.test? 'three' : 'fifteen'} minutes.`);
    await monitor.getLatestTaggedRelease();
    await monitor.ensureUpgrades();
  });
  monitorCron.start();

  /// Once a week reset the offline accumulations of nodes.
  const clearFrequency = '* * * * * 0';
  const clearCron = new CronJob(clearFrequency, () => {
    db.clearAccumulations();
  });
  clearCron.start();

  const scorekeeper = new Scorekeeper(api, db, config, maybeBot);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  /// Wipe the candidates on every start-up and re-add the ones in config.
  logger.info('Wiping old candidates data and intializing latest candidates from config.');
  await db.clearCandidates();
  if (config.scorekeeper.candidates.length) {
    for (const candidate of config.scorekeeper.candidates) {
      if (candidate === null) { continue; }
      else {
        //@ts-ignore
        await db.addCandidate(candidate.name, candidate.stash);
      }
    }
  }

  const scorekeeperFrequency = config.global.test
    ? '0 0-59/3 * * * *'  // Do nominations every three minutes.
    : '0 0 0 * * *';      // Do nominations every day at midnight.

  scorekeeper.begin(scorekeeperFrequency);
}

program
  .option('--config <file>', 'The path to the config file.', 'config.json')
  .action((cmd: Command) => start(cmd));


program.version('0.1.1');
program.parse(process.argv);
