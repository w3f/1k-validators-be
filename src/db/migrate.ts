/** Perform a DB migration. */

import MongoClient from "mongodb";

import logger from "../logger";
import Db from ".";

type MigrationConfig = {
  uri: string;
  db: string;
  collection: string;
};

/// The Migration class creates a handle to the old database, and takes a handle
/// to the new database. It recovers all the data it needs from the old one and
/// sets it in the new one.
export default class Migration {
  private _collection: any;
  private _confirm = false;
  private _newDb: Db;

  constructor(collection: any, newDb: Db) {
    this._collection = collection;
    this._newDb = newDb;
  }

  static async create(config: MigrationConfig, newDb: Db): Promise<Migration> {
    const mongo = await MongoClient.connect(config.uri);
    const db = await mongo.db(config.db);
    const collection = db.collection(config.collection);
    return new Migration(collection, newDb);
  }

  async allCandidates(): Promise<any[]> {
    return new Promise((resolve) => {
      this._collection.find({ stash: /.*/ }).toArray((err, docs) => {
        resolve(docs);
      });
    });
  }

  confirmMigration(): void {
    this._confirm = true;
  }

  // This function will wait until `this._confirm` is set to true.
  async doMigration(): Promise<boolean> {
    const candidates = await this.allCandidates();

    if (!this._confirm) {
      for (const candidate of candidates) {
        const { name, connectedAt, rank } = candidate;
        logger.info(
          `WILL MIGRATE ${name} with rank ${rank} and connected at ${connectedAt}.`
        );
      }
    } else {
      logger.info(`PERFORMING MIGRATION`);
      const hasMigrated = new Set();
      for (const candidate of candidates) {
        const { name, connectedAt, rank } = candidate;
        if (hasMigrated.has(name)) return;
        hasMigrated.add(name);
        await this._newDb.migrateCandidate(name, connectedAt, 10);
      }
      return true;
    }
  }
}
