import { ChainMetadataModel } from "../../../src/db/models";
import {
  getChainMetadata,
  setChainMetadata,
} from "../../../src/db/queries/ChainMetadata";
import { describe, expect, it } from "vitest";

describe("setChainMetadata", () => {
  it("should create chain metadata if none exists", async () => {
    await setChainMetadata(2); // Example call with networkPrefix = 2

    const result = await ChainMetadataModel.findOne({});
    expect(result).toBeDefined();
    expect(result?.name).toBe("Kusama");
    expect(result?.decimals).toBe(12);
  });

  it("should update chain metadata if it already exists", async () => {
    await new ChainMetadataModel({ name: "Polkadot", decimals: 10 }).save();
    await setChainMetadata(0); // Example call with networkPrefix = 0

    const result = await ChainMetadataModel.findOne({});
    expect(result).toBeDefined();
    expect(result?.name).toBe("Polkadot");
    expect(result?.decimals).toBe(10);
  });
});

describe("getChainMetadata", () => {
  it("should return null if no chain metadata exists", async () => {
    const result = await getChainMetadata();
    expect(result).toBeNull();
  });

  it("should return chain metadata if it exists", async () => {
    await new ChainMetadataModel({
      name: "Local Testnet",
      decimals: 12,
    }).save();

    const result = await getChainMetadata();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Local Testnet");
    expect(result?.decimals).toBe(12);
  });
});
