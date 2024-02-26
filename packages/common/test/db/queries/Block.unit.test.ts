import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { BlockIndexModel } from "../../../src/db/models";
import { getBlockIndex, setBlockIndex } from "../../../src/db/queries/Block";
import { Db } from "../../../src/db";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create(); // Start the in-memory MongoDB server
  const mongoUri = mongoServer.getUri();

  await Db.create(mongoUri);
  await BlockIndexModel.deleteMany({});
}, 60000);

afterAll(async () => {
  try {
    await BlockIndexModel.deleteMany({});
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop(); // Stop the in-memory MongoDB server
    } else {
      console.warn("mongoServer is undefined.");
    }
  } catch (error) {
    console.error("Error during afterAll:", error);
    throw error; // Rethrow the error to fail the test suite
  }
}, 60000);

describe("getBlockIndex", () => {
  it("should return null if no block index exists", async () => {
    const result = await getBlockIndex();
    expect(result).toBeNull();
  });

  it("should return the block index if it exists", async () => {
    // Assuming you have a BlockIndexModel with some data
    await new BlockIndexModel({ earliest: 0, latest: 100 }).save();

    const result = await getBlockIndex();
    expect(result).toBeDefined();
    expect(result?.earliest).toBe(0);
    expect(result?.latest).toBe(100);
  });
});

describe("setBlockIndex", () => {
  it("should create a new block index if none exists", async () => {
    await setBlockIndex(0, 100);

    const result = await BlockIndexModel.findOne({});
    expect(result).toBeDefined();
    expect(result?.earliest).toBe(0);
    expect(result?.latest).toBe(100);
  });

  it("should update the earliest block index if new earliest is smaller", async () => {
    await new BlockIndexModel({ earliest: 10, latest: 100 }).save();
    const index = await getBlockIndex();
    expect(index).toBeDefined();

    await setBlockIndex(5, 100);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const blocks = await BlockIndexModel.find({});
    const result = await BlockIndexModel.findOne({});

    expect(result).toBeDefined();
    expect(result?.earliest).toBe(5);
    expect(result?.latest).toBe(100);
  });

  it("should update the latest block index if new latest is larger", async () => {
    await new BlockIndexModel({ earliest: 0, latest: 100 }).save();
    await setBlockIndex(0, 150);

    const result = await BlockIndexModel.findOne({});

    expect(result).toBeDefined();
    expect(result?.earliest).toBe(0);
    expect(result?.latest).toBe(150);
  });

  it("should not update anything if the existing block index covers the range", async () => {
    await new BlockIndexModel({ earliest: 0, latest: 100 }).save();
    await setBlockIndex(10, 90);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const result = await BlockIndexModel.findOne({});
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(result).toBeDefined();
    expect(result?.earliest).toBe(0);
    expect(result?.latest).toBe(100);
  });
});
