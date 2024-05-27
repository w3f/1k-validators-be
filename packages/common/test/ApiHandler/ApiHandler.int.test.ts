import { beforeAll, describe, expect, it } from "vitest";
import { ApiHandler } from "../../src";
import { KusamaEndpoints } from "../../src/constants";

const TIMEOUT_DURATION = 5200000; // 120 seconds
describe("ApiHandler Integration Tests", () => {
  let handler: ApiHandler;

  beforeAll(async () => {
    handler = new ApiHandler(KusamaEndpoints);
  }, TIMEOUT_DURATION);

  it(
    "return functional api with getApi()",
    async () => {
      const api = await handler.getApi();
      expect(api.isConnected).toBe(true);
    },
    TIMEOUT_DURATION,
  );
});
