export const MockApi = {
  mock: {
    staking: {
      era: 0,
    },
  },
  getApi: () => MockApi,
  on: () => {},
  query: {
    staking: {
      ledger: () => ({
        isSome: true,
        unwrap: () => true,
      }),
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
    skipConnectionTime: true,
  },
  scorekeeper: {
    forceRound: false,
    nominating: false,
  },
};
