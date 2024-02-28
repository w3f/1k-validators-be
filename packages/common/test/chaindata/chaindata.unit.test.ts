import { ChainData } from "../../src/chaindata/chaindata";
import fs from "fs";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import path from "path";

jest.mock("../../src/chaindata/chaindata");

describe("ChainData Mock Unit Tests", () => {
  let mockValues: any;
  let chainData: ChainData;
  let handler: ApiHandler;

  beforeEach(() => {
    // Load mock values from JSON file separately
    const jsonPath = path.resolve(
      __dirname,
      "../../data/chaindata/kusamaMockValues.json",
    );
    const jsonData = fs.readFileSync(jsonPath, "utf-8");
    mockValues = JSON.parse(jsonData);

    // Create ChainData instance with mock values
    chainData = new ChainData(handler);
  });

  it("should have chainType equal to the loaded mock value", async () => {
    expect(await chainData.getChainType()).toEqual(mockValues.chainType);
  });

  it("should have denom equal to the loaded mock value", async () => {
    expect(await chainData.getDenom()).toEqual(mockValues.denom);
  });

  it("should have latestBlock equal to the loaded mock value", async () => {
    expect(await chainData.getLatestBlock()).toEqual(mockValues.latestBlock);
  });

  it("should have blockHash equal to the loaded mock value", async () => {
    expect(await chainData.getBlockHash(mockValues.latestBlock)).toEqual(
      mockValues.blockHash,
    );
  });

  it("should have block equal to the loaded mock value", async () => {
    expect(await chainData.getBlock(mockValues.latestBlock)).toEqual(
      mockValues.block,
    );
  });

  it("should have latestBlockHash equal to the loaded mock value", async () => {
    expect(await chainData.getLatestBlockHash()).toEqual(
      mockValues.latestBlockHash,
    );
  });

  it("should have session equal to the loaded mock value", async () => {
    expect(await chainData.getSession()).toEqual(mockValues.session);
  });

  it("should have activeEra equal to the loaded mock value", async () => {
    expect(await chainData.getActiveEraIndex()).toEqual(mockValues.activeEra);
  });

  it("should have currentEra equal to the loaded mock value", async () => {
    expect(await chainData.getCurrentEra()).toEqual(mockValues.currentEra);
  });

  it("should have sessionAtEra equal to the loaded mock value", async () => {
    expect(await chainData.getSessionAtEra(mockValues.activeEra[0])).toEqual(
      mockValues.sessionAtEra,
    );
  });
  it("should have totalEraPoints equal to the loaded mock value", async () => {
    expect(await chainData.getTotalEraPoints(mockValues.activeEra[0])).toEqual(
      mockValues.totalEraPoints,
    );
  });

  it("should have findEraBlockHash equal to the loaded mock value", async () => {
    expect(
      await chainData.findEraBlockHash(
        mockValues.activeEra[0] - 5,
        mockValues.chainType,
      ),
    ).toEqual(mockValues.findEraBlockHash);
  });

  it("should have currentValidators equal to the loaded mock value", async () => {
    expect(await chainData.currentValidators()).toEqual(
      mockValues.currentValidators,
    );
  });

  it("should have getCommission equal to the loaded mock value", async () => {
    expect(
      await chainData.getCommission(mockValues.currentValidators[0]),
    ).toEqual(mockValues.getCommission);
  });

  it("should have getBlocked equal to the loaded mock value", async () => {
    expect(await chainData.getBlocked(mockValues.currentValidators[0])).toEqual(
      mockValues.getBlocked,
    );
  });

  it("should have getBondedAmount equal to the loaded mock value", async () => {
    expect(
      await chainData.getBondedAmount(mockValues.currentValidators[0]),
    ).toEqual(mockValues.getBondedAmount);
  });

  it("should have getControllerFromStash equal to the loaded mock value", async () => {
    expect(
      await chainData.getControllerFromStash(mockValues.currentValidators[0]),
    ).toEqual(mockValues.getControllerFromStash);
  });

  it("should have getRewardDestination equal to the loaded mock value", async () => {
    expect(
      await chainData.getRewardDestination(mockValues.currentValidators[0]),
    ).toEqual(mockValues.getRewardDestination);
  });

  it("should have queuedKeys equal to the loaded mock value", async () => {
    expect(await chainData.getQueuedKeys()).toEqual(mockValues.queuedKeys);
  });

  it("should have nextKeys equal to the loaded mock value", async () => {
    expect(
      await chainData.getNextKeys(mockValues.currentValidators[0]),
    ).toEqual(mockValues.nextKeys);
  });

  it("should have balance equal to the loaded mock value", async () => {
    expect(await chainData.getBalance(mockValues.currentValidators[0])).toEqual(
      mockValues.balance,
    );
  });

  it("should have exposure equal to the loaded mock value", async () => {
    expect(
      await chainData.getExposure(
        mockValues.activeEra[0],
        mockValues.currentValidators[0],
      ),
    ).toEqual(mockValues.exposure);
  });

  it("should have activeValidatorsInPeriod equal to the loaded mock value", async () => {
    expect(
      await chainData.activeValidatorsInPeriod(
        mockValues.activeEra[0] - 5,
        mockValues.activeEra[0],
        mockValues.chainType,
      ),
    ).toEqual(mockValues.activeValidatorsInPeriod);
  });

  it("should have validatorsAtEra equal to the loaded mock value", async () => {
    expect(
      await chainData.getValidatorsAtEra(mockValues.activeEra[0] - 5),
    ).toEqual(mockValues.validatorsAtEra);
  });

  it("should have validators equal to the loaded mock value", async () => {
    expect(await chainData.getValidators()).toEqual(mockValues.validators);
  });

  it("should have hasIdentity equal to the loaded mock value", async () => {
    expect(await chainData.hasIdentity(mockValues.validators[0])).toEqual(
      mockValues.hasIdentity,
    );
  });

  it("should have getIdentity equal to the loaded mock value", async () => {
    expect(await chainData.getIdentity(mockValues.validators[0])).toEqual(
      mockValues.getIdentity,
    );
  });

  it("should have identity equal to the loaded mock value", async () => {
    expect(
      await chainData.getFormattedIdentity(mockValues.validators[0]),
    ).toEqual(mockValues.identity);
  });

  it("should have proxyAnnouncements equal to the loaded mock value", async () => {
    expect(
      await chainData.getProxyAnnouncements(mockValues.validators[0]),
    ).toEqual(mockValues.proxyAnnouncements);
  });

  it("should have nominators equal to the loaded mock value", async () => {
    expect(await chainData.getNominators()).toEqual(mockValues.nominators);
  });
});
