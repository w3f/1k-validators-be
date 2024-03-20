import { DelayedTx, DelayedTxModel } from "../../../src/db";
import {
  addDelayedTx,
  deleteDelayedTx,
  getAllDelayedTxs,
} from "../../../src/db/queries/DelayedTx";
import { describe, expect, it } from "vitest";

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
