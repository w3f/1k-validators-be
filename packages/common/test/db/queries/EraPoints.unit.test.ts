import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { EraPointsModel, TotalEraPointsModel } from "../../../src/db/models";
import {
  getEraPoints,
  getHistoryDepthEraPoints,
  getHistoryDepthTotalEraPoints,
  getIdentityValidatorEraPointsCount,
  getIdentityValidatorEraPointsCountMax,
  getLastTotalEraPoints,
  getSpanEraPoints,
  getTotalEraPoints,
  getValidatorEraPointsCount,
  getValidatorLastEraPoints,
  setEraPoints,
  setIdentity,
  setTotalEraPoints,
} from "../../../src/db/queries";

import { Db } from "../../../src/db";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create(); // Start the in-memory MongoDB server
  const mongoUri = mongoServer.getUri();
  await Db.create(mongoUri);
  await EraPointsModel.deleteMany({});
  await TotalEraPointsModel.deleteMany({});
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
  await EraPointsModel.deleteMany({});
  await TotalEraPointsModel.deleteMany({});
});

describe("setEraPoints", () => {
  it("should set era points for a given era and address", async () => {
    const result = await setEraPoints(1, 100, "address");
    expect(result).toBe(true);
  });
});

describe("getEraPoints", () => {
  it("should return era points for a given era and address", async () => {
    await setEraPoints(1, 100, "address");
    const result = await getEraPoints(1, "address");
    expect(result).toBeDefined();
    expect(result?.eraPoints).toBe(100);
  });
});

describe("setTotalEraPoints", () => {
  it("should set total era points for a given era and validators", async () => {
    const validators = [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ];
    const result = await setTotalEraPoints(1, 300, validators);
    expect(result).toBe(true);
  });
});

describe("getTotalEraPoints", () => {
  it("should return total era points for a given era", async () => {
    await setTotalEraPoints(1, 300, [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ]);
    const result = await getTotalEraPoints(1);
    expect(result).toBeDefined();
    expect(result?.totalEraPoints).toBe(300);
  });
});

describe("getLastTotalEraPoints", () => {
  it("should return the last total era points record", async () => {
    await setTotalEraPoints(1, 300, [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ]);
    const result = await getLastTotalEraPoints();
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
  });
});

describe("getSpanEraPoints", () => {
  it("should return era points for a given address and current era span", async () => {
    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 3,
      eraPoints: 300,
    });
    const result = await getSpanEraPoints("address1", 3);
    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
  });
});

describe("getHistoryDepthEraPoints", () => {
  it("should return era points for a given address and current era with depth", async () => {
    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 3,
      eraPoints: 300,
    });
    const result = await getHistoryDepthEraPoints("address1", 3);
    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
  });
});

describe("getHistoryDepthTotalEraPoints", () => {
  it("should return total era points with depth", async () => {
    await TotalEraPointsModel.create({ era: 1, totalEraPoints: 100 });
    await TotalEraPointsModel.create({ era: 2, totalEraPoints: 200 });
    await TotalEraPointsModel.create({ era: 3, totalEraPoints: 300 });
    const result = await getHistoryDepthTotalEraPoints(3);
    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
  });
});

describe("getValidatorLastEraPoints", () => {
  it("should return the last era points record for a validator", async () => {
    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    const result = await getValidatorLastEraPoints("address1");
    expect(result).toBeDefined();
    expect(result?.era).toBe(2);
  });
});

describe("getValidatorEraPointsCount", () => {
  it("should return the number of eras a validator has era points for", async () => {
    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    const result = await getValidatorEraPointsCount("address1");
    expect(result).toBe(2);
  });
});

describe("getIdentityValidatorEraPointsCount", () => {
  it("should return era points count for each validator of an identity", async () => {
    await setIdentity({
      name: "identity1",
      address: "address1",
      verified: true,
    });

    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    const result = await getIdentityValidatorEraPointsCount("address1");
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0].eras).toBe(2);
  });
});

describe("getIdentityValidatorEraPointsCountMax", () => {
  it("should return the maximum era points count for a validator of an identity", async () => {
    await setIdentity({
      name: "identity1",
      address: "address1",
      verified: true,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 1,
      eraPoints: 100,
    });
    await EraPointsModel.create({
      address: "address1",
      era: 2,
      eraPoints: 200,
    });
    const result = await getIdentityValidatorEraPointsCountMax("address1");
    expect(result).toBe(2);
  });
});

describe("setEraPoints", () => {
  it("should create a new era points record if it does not exist", async () => {
    const result = await setEraPoints(1, 100, "address1");
    expect(result).toBeTruthy();
    const eraPoints = await EraPointsModel.findOne({
      era: 1,
      address: "address1",
    });
    expect(eraPoints).toBeDefined();
    expect(eraPoints?.eraPoints).toBe(100);
  });
});

describe("setTotalEraPoints", () => {
  it("should create a new total era points record if it does not exist", async () => {
    const validators = [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ];
    const result = await setTotalEraPoints(1, 300, validators);
    expect(result).toBeTruthy();
    const totalEraPoints = await TotalEraPointsModel.findOne({ era: 1 });
    expect(totalEraPoints).toBeDefined();
    expect(totalEraPoints?.totalEraPoints).toBe(300);
  });

  it("should update the total era points record if it already exists with different total points", async () => {
    await TotalEraPointsModel.create({ era: 1, totalEraPoints: 150 });
    const validators = [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ];
    const result = await setTotalEraPoints(1, 300, validators);
    expect(result).toBeTruthy();
    const totalEraPoints = await TotalEraPointsModel.findOne({ era: 1 });
    expect(totalEraPoints).toBeDefined();
    expect(totalEraPoints?.totalEraPoints).toBe(300);
  });

  it("should not update the total era points record if it already exists with the same total points", async () => {
    await TotalEraPointsModel.create({ era: 1, totalEraPoints: 300 });
    const validators = [
      { address: "address1", eraPoints: 100 },
      { address: "address2", eraPoints: 200 },
    ];
    const result = await setTotalEraPoints(1, 300, validators);
    expect(result).toBeTruthy();
    const totalEraPoints = await TotalEraPointsModel.findOne({ era: 1 });
    expect(totalEraPoints).toBeDefined();
    expect(totalEraPoints?.totalEraPoints).toBe(300);
  });
});
