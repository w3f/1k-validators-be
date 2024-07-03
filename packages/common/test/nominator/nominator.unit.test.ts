import { Types } from "../../src";
import Nominator from "../../src/nominator/nominator";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../src/nominator/nominator");

vi.mock("../../src/ApiHandler/ApiHandler");

describe("Nominator Mock Class Unit Tests", () => {
  let nominator: Nominator;
  let handler;
  let nominatorConfig: Types.NominatorConfig;

  const signerAddress = "DvDsrjvaJpXNW7XLvtFtEB3D9nnBKMqzvrijFffwpe7CCc6";
  beforeAll(async () => {
    handler = new ApiHandler("relay", ["Constants.KusamaEndpoints"]);
    await handler.getApi();

    nominatorConfig = {
      isProxy: false,
      seed: "0x" + "00".repeat(32),
      proxyDelay: 10800,
      proxyFor: "0x" + "01".repeat(32),
    };

    nominator = new Nominator(handler, nominatorConfig, 2, null);
  });

  it("should match fields with config", async () => {
    // nominator.address
    expect(nominator.address).toEqual(signerAddress);

    // nominator.bondedAddress
    expect(nominator.bondedAddress).toEqual(signerAddress);

    // nominator.isProxy
    expect(nominator.isProxy).toEqual(false);

    // nominator.proxyDelay
    expect(nominator.proxyDelay).toEqual(10800);

    // nominator.stash
    expect(await nominator.stash()).toEqual(signerAddress);

    // nominator.payee
    expect(await nominator.payee()).toEqual(signerAddress);
  });

  it("should return true when calling nominate", async () => {
    // Act: Call the nominate function
    const result = await nominator.nominate(["target1", "target2"]);

    // Assert: Check that the result is true
    expect(result).toBe(true);
  });

  it("should update currentlyNominating when calling nominate", async () => {
    // Act: Call the nominate function
    await nominator.nominate(["target1", "target2"]);

    // Assert: Check that currentlyNominating was updated correctly
    expect(nominator.currentlyNominating).toEqual(["target1", "target2"]);
  });
});
