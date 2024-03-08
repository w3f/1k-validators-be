import { EraModel } from "../../../src/db/models";
import {
  getLastNominatedEraIndex,
  setLastNominatedEraIndex,
} from "../../../src/db/queries/Era";
import { initTestServerBeforeAll } from "../../testUtils/dbUtils";
import { describe, expect, it } from "vitest";

initTestServerBeforeAll();

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
