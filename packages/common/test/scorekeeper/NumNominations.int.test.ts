import { ApiPromise, WsProvider } from "@polkadot/api";

import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import { KusamaEndpoints } from "../../src/constants";
import Nominator from "../../src/nominator/nominator";
import ApiHandler from "../../src/ApiHandler/ApiHandler";

describe("autoNumNominations Integration Test", () => {
  it("queries the real API and retrieves data", async () => {
    const api = await ApiPromise.create({
      provider: new WsProvider(KusamaEndpoints, 5000, undefined, 100000000),
    });
    await api.isReadyOrError;

    const handler = new ApiHandler(KusamaEndpoints);

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
