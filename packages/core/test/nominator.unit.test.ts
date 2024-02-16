// Mocking the Nominator module with NominatorMock
// @ts-ignore
import Nominator from "../src/nominator";
import { ApiHandler, Types } from "@1kv/common";

jest.mock("../src/nominator", () => {
  const { NominatorMock } = require("./mock/nominator.mock");
  return { Nominator: NominatorMock };
});
jest.mock("@1kv/common", () => {
  const originalModule = jest.requireActual("@1kv/common");
  const ApiHandlerMock = require("./mock/apihandler.mock").default; // Adjust this line if ApiHandlerMock is not a default export

  return {
    ...originalModule,
    ApiHandler: ApiHandlerMock,
  };
});
describe("Your Test Suite", () => {
  let handler: ApiHandler;
  let nominator: Nominator;

  beforeAll(async () => {
    handler = new ApiHandler(["Constants.KusamaEndpoints"]);
    await handler.setAPI();

    const nominatorConfig: Types.NominatorConfig = {
      isProxy: false,
      seed: "0x" + "00".repeat(32),
      proxyDelay: 10800,
      proxyFor: "0x" + "01".repeat(32),
    };

    nominator = new Nominator(handler, nominatorConfig, 2, null);
  });

  it("should use the mocked Nominator class", async () => {
    console.log(ApiHandler);

    // Now, 'nominator' is an instance of NominatorMock instead of the real Nominator class

    // You can call any method on 'nominator' and it will use the mocked implementation
    const result = await nominator.nominate(["target1", "target2"]);
    expect(result).toBe(true); // Assuming your mock `nominate` method returns `true`
  });
});
