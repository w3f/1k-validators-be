import mongoose from "mongoose";

import logger from "../logger";

import * as queries from "./queries";

// [name, client, version, null, networkId]
export type NodeDetails = [
  string,
  string,
  string,
  string,
  string,
  string,
  any?,
  any?
];

export * from "./queries";

export const dbLabel = { label: "DB" };

export class Db {
  static async create(uri = "mongodb://localhost:27017/otv"): Promise<Db> {
    logger.info(`Connecting to mongodb at: ${uri}`, dbLabel);
    mongoose.connect(uri, {});

    return new Promise((resolve, reject) => {
      mongoose.connection.once("open", async () => {
        logger.info(`Established a connection to MongoDB.`, dbLabel);
        // Initialize lastNominatedEraIndex if it's not already set.
        if (!(await queries.getLastNominatedEraIndex())) {
          await queries.setLastNominatedEraIndex(0);
        }
        resolve(true);
      });

      mongoose.connection.on("error", (err) => {
        logger.error(`MongoDB connection issue: ${err}`, dbLabel);
        reject(err);
      });
    });
  }
}

process.on("SIGINT", async () => {
  logger.info("Shutting down mongodb connection.....", dbLabel);
  await mongoose.connection.close();
  process.exit(0);
});
