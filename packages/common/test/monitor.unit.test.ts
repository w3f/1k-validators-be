import Monitor from "../src/monitor";
import { Octokit } from "@octokit/rest";
import { queries } from "../src";

describe("Monitor", () => {
  it("should retrieve the latest tagged release", async () => {
    const monitor = new Monitor(10);
    const latest = await monitor.getLatestTaggedRelease();

    console.log(JSON.stringify(latest));
    expect(latest).toBeDefined();
    expect(latest?.name).toBe("v1.2.3");
    expect(latest?.publishedAt).toBe(
      new Date("2021-01-01T00:00:00Z").getTime(),
    );
    expect(Octokit.prototype.repos.getLatestRelease).toHaveBeenCalledWith({
      owner: "paritytech",
      repo: "polkadot-sdk",
    });
    expect(queries.setRelease).toHaveBeenCalledWith(
      "v1.2.3",
      expect.any(Number),
    );
  }, 10000);
});
