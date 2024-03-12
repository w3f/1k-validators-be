import { beforeAll, describe, expect, it } from "vitest";
import { getKusamaHandler } from "../testUtils/apiHandler";
import { ApiHandler } from "../../src";

const TIMEOUT_DURATION = 5200000; // 120 seconds
describe("ApiHandler Integration Tests", () => {
  let handler: ApiHandler;

  beforeAll(async () => {
    handler = await getKusamaHandler();
  }, TIMEOUT_DURATION);

  it(
    "should check API connection",
    async () => {
      console.log("waiting....");
      const healthy = await handler.healthCheck();
      expect(healthy).toBe(true);
    },
    TIMEOUT_DURATION,
  );
});
