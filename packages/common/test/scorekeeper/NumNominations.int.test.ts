import { ApiPromise, WsProvider } from "@polkadot/api";

import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import { KusamaEndpoints } from "../../src/constants";

describe("autoNumNominations Integration Test", () => {
  it("queries the real API and retrieves data", async () => {
    const api = await ApiPromise.create({
      provider: new WsProvider(KusamaEndpoints, 5000, undefined, 100000000),
    });
    await api.isReadyOrError;

    const nom = {
      stash: () => "EX9uchmfeSqKTM7cMMg8DkH49XV8i4R7a7rqCn8btpZBHDP",
    };

    const result = await autoNumNominations(api, nom as any);

    expect(result).toBeDefined();

    await api.disconnect();
  }, 160000);
});
