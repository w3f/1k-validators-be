import { ApiPromise, WsProvider } from "@polkadot/api";

import { autoNumNominations } from "../../src/scorekeeper";
import { KusamaEndpoints } from "../../src/constants";

const TestNominator = {
  stash: () => "EX9uchmfeSqKTM7cMMg8DkH49XV8i4R7a7rqCn8btpZBHDP",
};

(async () => {
  const api = await ApiPromise.create({
    provider: new WsProvider(KusamaEndpoints),
  });

  const result = await autoNumNominations(api, TestNominator as any);
  console.log(result);
})();
