import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { EraModel } from "../../../src/db/models";
import {
  getLastNominatedEraIndex,
  setLastNominatedEraIndex,
} from "../../../src/db/queries/Era";
import { Db } from "../../../src/db";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create(); // Start the in-memory MongoDB server
  const mongoUri = mongoServer.getUri();
  await Db.create(mongoUri);
  await EraModel.deleteMany({});
}, 60000);

afterAll(async () => {
  try {
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

beforeEach(async () => {
  await EraModel.deleteMany({});
});

describe("setLastNominatedEraIndex", () => {
  it("should create a new era index if none exists", async () => {
    await setLastNominatedEraIndex(5);
    const result = await EraModel.findOne({});
    expect(result).toBeDefined();
    expect(result?.lastNominatedEraIndex).toBe("5");
  });

  it("should update the last nominated era index", async () => {
    await setLastNominatedEraIndex(10);
    await setLastNominatedEraIndex(15);
    const result = await EraModel.findOne({});
    expect(result).toBeDefined();
    expect(result?.lastNominatedEraIndex).toBe("15");
  });
});

describe("getLastNominatedEraIndex", () => {
  it("should return null if no era index exists", async () => {
    const result = await getLastNominatedEraIndex();
    expect(result).toBeNull();
  });

  it("should return the last nominated era index if it exists", async () => {
    await setLastNominatedEraIndex(20);
    const result = await getLastNominatedEraIndex();
    expect(result).toBeDefined();
    expect(result?.lastNominatedEraIndex).toBe("20");
  });
});
