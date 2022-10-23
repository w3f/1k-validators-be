import mongoose from "mongoose";

import logger from "../logger";

import * as queries from "./queries";

// [name, client, version, null, networkId]
export type NodeDetails = [string, string, string, string, string, string];

export * from "./queries";

export class Db {
  static async create(uri = "mongodb://localhost:27017/otv"): Promise<Db> {
    logger.info(`Connecting to mongodb at: ${uri}`);
    mongoose.connect(uri, {});

    return new Promise((resolve, reject) => {
      mongoose.connection.once("open", async () => {
        logger.info(`Established a connection to MongoDB.`);
        // Initialize lastNominatedEraIndex if it's not already set.
        if (!(await queries.getLastNominatedEraIndex())) {
          await queries.setLastNominatedEraIndex(0);
        }
        resolve(true);
      });

      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection issue: ${err}`);
        reject(err);
      });
    });
  }
}

process.on("SIGINT", async () => {
  logger.info("Shutting down mongodb connection.....");
  await mongoose.connection.close();
  process.exit(0);
});
