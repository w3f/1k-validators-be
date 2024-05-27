import Nominator from "../../src/nominator/nominator";
import ChainData from "../../src/chaindata/chaindata";
import { ApiHandler } from "../../src";
import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { KusamaEndpoints, KusamaPeopleEndpoints } from "../../src/constants";

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
  let chaindata: ChainData;
  let nominator: Nominator;

  beforeEach(async () => {
    vi.spyOn(ApiHandler.prototype, "getApi").mockResolvedValue({
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

    const relayApiHandler = new ApiHandler(KusamaEndpoints);
    const peopleApiHandler = new ApiHandler(KusamaPeopleEndpoints);

    chaindata = new ChainData({
      relay: relayApiHandler,
      people: peopleApiHandler,
    });

    nominator = new Nominator(
      chaindata,
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

    const result = await autoNumNominations(nominator);

    expect(result.nominationNum).toBeGreaterThan(0);
  });
});
