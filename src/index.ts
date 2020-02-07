import { ApiPromise, WsProvider } from '@polkadot/api';

import Config from '../config.json';
import Database from './db';
import Scorekeeper from './scorekeeper';
import Server from './server';

try {
  (
    async () => {
      const api = await ApiPromise.create({
        provider: new WsProvider(Config.nominate.wsEndpoint),
      });

      const db = new Database(Config.storageFile);
      const server = new Server(db, Config.serverPort);
      
      /// Time to start the nominators.
      const scorekeeper = new Scorekeeper(api, db);
      for (const nominator of Config.nominate.nominators) {
        await scorekeeper.spawn(nominator);
      }

      scorekeeper.begin();
    }
  )();
} catch (err) { console.error(err); }
