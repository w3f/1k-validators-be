import Monitor from "../../src/monitor";
import { queries } from "@1kv/common"; // Assuming logger and queries are exported from this module
import { Octokit } from "@octokit/rest";

// Mock the logger, Octokit, and queries modules
jest.mock("@1kv/common", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
  },
  queries: {
    setRelease: jest.fn(),
  },
}));
jest.mock("@octokit/rest");

describe("Monitor", () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    Octokit.prototype.repos = {
      getLatestRelease: jest.fn().mockResolvedValue({
        data: {
          tag_name: "v1.2.3",
          published_at: "2021-01-01T00:00:00Z",
        },
      }),
    };

    // Mock `queries.setRelease` to resolve without modifying the database
    (queries.setRelease as jest.Mock).mockResolvedValue({});
  });

  it("should retrieve the latest tagged release", async () => {
    const monitor = new Monitor(10);
    const latest = await monitor.getLatestTaggedRelease();

    // Assertions about the fetched latest release
    expect(latest).toBeDefined();
    expect(latest.name).toBe("v1.2.3");
    expect(latest.publishedAt).toBe(new Date("2021-01-01T00:00:00Z").getTime());

    // Verify that Octokit's `getLatestRelease` was called with the correct parameters
    expect(Octokit.prototype.repos.getLatestRelease).toHaveBeenCalledWith({
      owner: "paritytech",
      repo: "polkadot-sdk",
    });

    // Verify that `queries.setRelease` was called with the correct parameters
    expect(queries.setRelease).toHaveBeenCalledWith(
      "v1.2.3",
      expect.any(Number),
    );
  }, 10000); // Extended timeout for potentially long-running operations
});
