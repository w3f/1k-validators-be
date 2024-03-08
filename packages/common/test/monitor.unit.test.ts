import Monitor from "../src/monitor";
import { Octokit } from "@octokit/rest";
import { queries } from "../src";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("../src/index", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
  },
  queries: {
    setRelease: vi.fn(),
  },
}));
vi.mock("@octokit/rest");

describe("Monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Octokit.prototype.repos = {
      getLatestRelease: vi.fn().mockResolvedValue({
        data: {
          tag_name: "v1.2.3",
          published_at: "2021-01-01T00:00:00Z",
        },
      }),
    };
    (queries.setRelease as Mock).mockResolvedValue({});
  });

  it("should retrieve the latest tagged release", async () => {
    const monitor = new Monitor(10);
    const latest = await monitor.getLatestTaggedRelease();

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
