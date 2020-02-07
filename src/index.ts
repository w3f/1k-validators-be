import { ApiPromise, WsProvider } from '@polkadot/api';

import Config from '../config.json';
import Database from './db';
import Scorekeeper from './scorekeeper';
import Server from './server';
import TelemetryClient from './telemetry';

try {
  (
    async () => {
      const api = await ApiPromise.create({
        provider: new WsProvider(Config.nominate.wsEndpoint),
      });

      const db = new Database(Config.storageFile);
      const server = new Server(db, Config.serverPort);
      
      const telemetry = new TelemetryClient(Config, db);
      telemetry.start();
      
      /// The monitoring service that keeps our nodes on their feet.
      // const monitor = new Monitor();

      /// Time to start the nominators.
      const scorekeeper = new Scorekeeper(api, db);
      for (const nominator of Config.nominate.nominators) {
        await scorekeeper.spawn(nominator.seed);
      }

      scorekeeper.begin();
    }
  )();
} catch (err) { console.error(err); }
