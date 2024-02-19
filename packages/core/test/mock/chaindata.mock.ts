import { ApiPromise } from "@polkadot/api";
import { ApiHandler, logger } from "@1kv/common";

// Mock implementation of ChainData class
export class ChainData {
  public api: ApiPromise;

  constructor(handler: ApiHandler) {
    // Mock the ApiPromise object as needed
    this.api = {
      isConnected: jest.fn().mockReturnValue(true), // Example of mocking a property
      rpc: {
        system: {
          chain: jest.fn().mockResolvedValue({ toString: () => "MockChain" }),
        },
        chain: {
          getBlockHash: jest
            .fn()
            .mockResolvedValue({ toString: () => "MockBlockHash" }),
          getBlock: jest.fn().mockResolvedValue("MockBlock"),
        },
      },
      at: jest.fn().mockResolvedValue("MockApiAt"),
    } as unknown as ApiPromise;

    // Mock logger info
    logger.info = jest.fn();

    // Other constructor logic...
  }

  checkApiConnection = jest.fn().mockResolvedValue(undefined);
  getChainType = jest.fn().mockResolvedValue("Polkadot");
  getDenom = jest.fn().mockResolvedValue(10000000000); // Example value, adjust as needed
  getApiAt = jest.fn().mockResolvedValue("MockApiAt");
  getBlockHash = jest.fn().mockResolvedValue("MockBlockHash");
  getBlock = jest.fn().mockResolvedValue("MockBlock");
}
