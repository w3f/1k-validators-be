export const MockApi = {
  mock: {
    staking: {
      era: 0,
    },
  },
  query: {
    staking: {
      currentEra: () => {
        return MockApi.mock.staking.era;
      },
      activeEra: () => {
        return {
          unwrap: () => {
            return {
              index: {
                toNumber: () => {
                  MockApi.mock.staking.era;
                },
              },
            };
          },
        };
      },
      stakers: (stash: any) => {
        return {
          toJSON: () => {
            return {
              own: 50 * 10 ** 12,
            };
          },
        };
      },
      erasStakers: (era: number, stash: string) => ({
        isEmpty: false,
        own: {
          toNumber: () => 50 * 10 ** 12,
        },
      }),
      erasValidatorPrefs: (era: number, stash: string) => ({
        isEmpty: false,
        commission: {
          toNumber: () => {
            if (stash === "4HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc") {
              return 20000000;
            } else {
              return 10000000;
            }
          },
        },
      }),
      validators: (stash: any) => {
        switch (stash) {
          case "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY":
            {
              return {
                toJSON: () => [
                  {
                    commission: "10000000",
                  },
                ],
              };
            }
            break;
          case "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc":
            {
              return {
                toJSON: () => [
                  {
                    commission: "10000000",
                  },
                ],
              };
            }
            break;
          default: {
            return {
              toJSON: () => [
                {
                  commission: "20000000",
                },
              ],
            };
          }
        }
      },
    },
  },
};

export const MockConfig = {
  global: {
    test: false,
  },
  constraints: {
    skipConnection: true,
  },
  scorekeeper: {
    forceRound: false,
    nominating: false,
  },
};

export const MockDb = {
  allNodes: () => {
    return [
      {
        name: "Alice",
        stash: "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY",
        offlineSince: 0,
        onlineSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
        offlineAccumulated: 0,
        connectedAt: 0,
        nominatedAt: 1,
      },
      {
        name: "Bob",
        stash: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
        offlineSince: 0,
        onlineSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
        offlineAccumulated: 0,
        connectedAt: 1,
        nominatedAt: 0,
      },
      {
        name: "Charlie",
        stash: null, // Filters because no stash.
      },
      {
        name: "Dave",
        stash: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
        offlineSince: 100, // filter because offlineSince > 0
      },
      {
        name: "Eve",
        stash: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
        offlineSince: 0,
        onlineSince: new Date().getTime(), // filtered because not good for a week
      },
      {
        name: "Ferdie",
        stash: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
        offlineSince: 0,
        onlineSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
        offlineAccumulated: 0.021 * 7 * 24 * 60 * 60 * 1000, // filtered due to too much
      },
      {
        name: "George",
        stash: "4HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc", // doesn't have commission set right
        offlineSince: 0,
        onlineSince: new Date().getTime() - 8 * 24 * 60 * 60 * 1000,
        offlineAccumulated: 0,
      },
    ];
  },
  getCurrentTargets: () => [],
};
