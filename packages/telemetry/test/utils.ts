import { MongoMemoryServer } from "mongodb-memory-server";
import { Config, Db, logger, metrics } from "@1kv/common";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

let mongoServer: MongoMemoryServer | null = null;
let mongoUri: string | null = null;

function getConfig(): Config.ConfigSchema {
  const jsonPath = path.resolve(
    __dirname,
    "../../../packages/core/config/kusama.current.sample.json",
  );
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  return JSON.parse(jsonData);
}

export const createTestServer = async () => {
  const isCI = process.env.CI === "true";

  // If the environment is CI, run the tests in a Docker container with a mongo container
  if (isCI) {
    mongoUri = process.env.MONGO_URI || "mongodb://mongodb:27017";
  } else {
    // Run tests with a mongo memory server
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
  }

  await metrics.setupMetrics(getConfig());
  logger.info("Connecting to MongoDB at URI:", mongoUri);
  await Db.create(mongoUri);
  logger.info("Connected to MongoDB");
};

export const initTestServerBeforeAll = () => {
  beforeAll(async () => {
    await createTestServer();
  });

  beforeEach(async () => {
    const dbName = `testdb_${Date.now()}`;
    await mongoose.connection.useDb(dbName);
  });
  afterEach(async () => {});

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
};
