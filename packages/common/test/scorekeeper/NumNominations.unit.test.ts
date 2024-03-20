import { ApiPromise } from "@polkadot/api";
import Nominator from "../../src/nominator/nominator";
import { ApiHandler } from "../../src";
import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("@polkadot/api", () => ({
  ApiPromise: {
    create: vi.fn(),
  },
}));

vi.mock("../../src/nominator/nominator");
vi.mock("../../src/ApiHandler/ApiHandler");

const mockCompact = (value: bigint) => ({
  unwrap: () => ({
    toBigInt: () => value,
  }),
});

describe("autoNumNominations", () => {
  let api: ApiPromise;
  let nominator: Nominator;
  let handler: ApiHandler;

  beforeEach(async () => {
    (ApiPromise.create as Mock).mockResolvedValue({
      rpc: {
        system: {
          chain: vi.fn().mockResolvedValue("Polkadot"),
        },
      },
      query: {
        system: {
          account: vi.fn().mockResolvedValue({
            data: {
              free: mockCompact(BigInt(5000000000000)),
              reserved: mockCompact(BigInt(1000000000000)),
            },
          }),
        },
      },
      derive: {
        staking: {
          electedInfo: vi.fn().mockResolvedValue({
            info: [
              {
                exposure: {
                  total: mockCompact(BigInt(100000000000)),
                  own: mockCompact(BigInt(50000000000)),
                  others: [],
                },
              },
              {
                exposure: {
                  total: mockCompact(BigInt(200000000000)),
                  own: mockCompact(BigInt(100000000000)),
                  others: [],
                },
              },
            ],
          }),
        },
      },
    });

    api = await ApiPromise.create();
    handler = new ApiHandler(["wss://kusama-rpc.polkadot.io"]);
    nominator = new Nominator(
      handler,
      {
        seed: "word word word word word word word word word word word word",
        isProxy: false,
      },
      0,
      null,
    );
  });

  it("should calculate the number of nominations correctly", async () => {
    nominator.stash = vi.fn().mockResolvedValue("stashAddress");

    const result = await autoNumNominations(api, nominator);

    expect(result.nominationNum).toBeGreaterThan(0);
  });
});
