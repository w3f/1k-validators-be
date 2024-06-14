import { autoNumNominations } from "../../src/scorekeeper/NumNominations";
import Nominator from "../../src/nominator/nominator";
import { describe, expect, it } from "vitest";
import { getKusamaChainData } from "../testUtils/chaindata";

describe("autoNumNominations Integration Test", () => {
  it("queries the real API and retrieves data", async () => {
    const chaindata = await getKusamaChainData();

    const nominatorConfig = {
      isProxy: false,
      seed: "0x" + "00".repeat(32),
      proxyDelay: 10800,
      proxyFor: "EX9uchmfeSqKTM7cMMg8DkH49XV8i4R7a7rqCn8btpZBHDP",
    };

    const nominator = new Nominator(chaindata, nominatorConfig, 2, null);

    const result = await autoNumNominations(nominator);

    expect(result).toBeDefined();
  }, 160000);
});
