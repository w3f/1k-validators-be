import { ApiPromise } from "@polkadot/api";
import Nominator from "../../src/nominator/nominator";
import { ApiHandler } from "../../src";
import { autoNumNominations } from "../../src/scorekeeper/NumNominations";

jest.mock("@polkadot/api", () => ({
  ApiPromise: {
    create: jest.fn(),
  },
}));

jest.mock("../../src/nominator/nominator");
jest.mock("../../src/ApiHandler/ApiHandler");

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
    (ApiPromise.create as jest.Mock).mockResolvedValue({
      rpc: {
        system: {
          chain: jest.fn().mockResolvedValue("Polkadot"),
        },
      },
      query: {
        system: {
          account: jest.fn().mockResolvedValue({
            data: {
              free: mockCompact(BigInt(5000000000000)),
              reserved: mockCompact(BigInt(1000000000000)),
            },
          }),
        },
      },
      derive: {
        staking: {
          electedInfo: jest.fn().mockResolvedValue({
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
    nominator.stash = jest.fn().mockResolvedValue("stashAddress");

    const result = await autoNumNominations(api, nominator);

    expect(result.nominationNum).toBeGreaterThan(0);
  });
});
