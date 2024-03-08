import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import { KusamaEndpoints } from "../../src/constants";
import Nominator from "../../src/nominator/nominator";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { describe, expect, it } from "vitest";
import { initTestServerBeforeAll } from "../testUtils/dbUtils";

initTestServerBeforeAll();
describe("autoNumNominations Integration Test", () => {
  it("queries the real API and retrieves data", async () => {
    const handler = new ApiHandler(KusamaEndpoints);
    await handler.initiateConnection();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const api = handler.getApi();

    const nominatorConfig = {
      isProxy: false,
      seed: "0x" + "00".repeat(32),
      proxyDelay: 10800,
      proxyFor: "EX9uchmfeSqKTM7cMMg8DkH49XV8i4R7a7rqCn8btpZBHDP",
    };

    const nominator = new Nominator(handler, nominatorConfig, 2, null);

    const result = await autoNumNominations(api, nominator);

    expect(result).toBeDefined();

    await api.disconnect();
  }, 160000);
});
