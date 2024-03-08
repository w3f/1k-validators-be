import Monitor from "../src/monitor";
import { queries } from "../src";

describe("Monitor", () => {
  it("should retrieve the latest tagged release", async () => {
    const monitor = new Monitor(10);
    const latest = await monitor.getLatestTaggedRelease();

    console.log(JSON.stringify(latest));
    expect(latest).toBeDefined();

    expect(queries.setRelease).toHaveBeenCalledWith(
      latest.name,
      expect.any(latest.publishedAt),
    );
  }, 10000);
});
