import Monitor from "../src/monitor";
import { describe, expect, it } from "vitest";

describe("Monitor", () => {
  it("should retrieve the latest tagged release", async () => {
    const monitor = new Monitor(10);
    const latest = await monitor.getLatestTaggedRelease();
    expect(latest).toBeDefined();
  }, 10000);
});
