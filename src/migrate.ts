import Datastore from 'nedb';
import MongoClient from 'mongodb';

import { DbConf } from './db';

export const migrate = async (storageFile, dbConf: DbConf) => {
  const mongo = await MongoClient.connect(dbConf.uri);
  const db = await mongo.db(dbConf.dbName);
  const collection = db.collection(dbConf.collection);

  const store = new Datastore({ filename: storageFile, autoload: true });
  store.find({ }, async (err, docs) => {
    if (err) {
      throw err;
    }

    for (const doc of docs) {
      console.log(doc);
      delete doc._id;
      await collection.insertOne(doc);
    }
  });
}
