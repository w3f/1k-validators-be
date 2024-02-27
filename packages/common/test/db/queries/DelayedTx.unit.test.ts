import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { Db, DelayedTx, DelayedTxModel } from "../../../src/db";
import {
  addDelayedTx,
  deleteDelayedTx,
  getAllDelayedTxs,
} from "../../../src/db/queries/DelayedTx";

let mongoServer: MongoMemoryServer;
let mongoUri: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create(); // Start the in-memory MongoDB server
  mongoUri = mongoServer.getUri();

  await Db.create(mongoUri);
  await DelayedTxModel.deleteMany({});
}, 60000);

afterAll(async () => {
  try {
    await DelayedTxModel.deleteMany({});
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
  await DelayedTxModel.deleteMany({});
});

describe("addDelayedTx", () => {
  it("should add a delayed transaction", async () => {
    const tx: DelayedTx = {
      number: 123,
      controller: "testController",
      targets: ["target1", "target2"],
      callHash: "callHash123",
    };

    const result = await addDelayedTx(tx);

    expect(result).toBe(true);

    const delayedTx = await DelayedTxModel.findOne({
      number: tx.number,
      controller: tx.controller,
    });
    expect(delayedTx).toBeDefined();
    expect(delayedTx?.number).toBe(tx.number);
    expect(delayedTx?.controller).toBe(tx.controller);
    expect(delayedTx?.targets).toEqual(expect.arrayContaining(tx.targets));
    expect(delayedTx?.callHash).toBe(tx.callHash);
  });
});

describe("getAllDelayedTxs", () => {
  it("should return all delayed transactions", async () => {
    const delayedTxs: DelayedTx[] = [
      {
        number: 123,
        controller: "controller1",
        targets: ["target1"],
        callHash: "hash1",
      },
      {
        number: 456,
        controller: "controller2",
        targets: ["target2"],
        callHash: "hash2",
      },
    ];

    await DelayedTxModel.insertMany(delayedTxs);

    const result = await getAllDelayedTxs();

    expect(result).toHaveLength(delayedTxs.length);
  });
});

describe("deleteDelayedTx", () => {
  it("should delete a delayed transaction", async () => {
    const tx: DelayedTx = {
      number: 123,
      controller: "testController",
      targets: ["target1", "target2"],
      callHash: "callHash123",
    };

    await addDelayedTx(tx);

    let delayedTx = await DelayedTxModel.findOne({
      number: tx.number,
      controller: tx.controller,
    });
    expect(delayedTx).toBeDefined();

    await deleteDelayedTx(tx.number, tx.controller);

    delayedTx = await DelayedTxModel.findOne({
      number: tx.number,
      controller: tx.controller,
    });
    expect(delayedTx).toBeNull();
  });
});
