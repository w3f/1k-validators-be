import ChainData from "../../src/chaindata";
import { ApiPromise, WsProvider } from "@polkadot/api";

const createApi = (): Promise<ApiPromise> => {
  return ApiPromise.create({
    provider: new WsProvider("wss://kusama-rpc.polkadot.io/"),
  });
};

(async () => {
  const api = await createApi();
  const chaindata = new ChainData(api);

  const [activeEra, eraErr] = await chaindata.getActiveEraIndex();
  if (eraErr) {
    throw eraErr;
  }

  const entries = await api.query.staking.erasStakers.entries(activeEra);
  const validators = entries.map(([key]) => key.args[1]);

  const testValidator = validators[1].toString();

  const [commisssion, err] = await chaindata.getCommission(
    activeEra,
    testValidator
  );
  if (err) {
    throw new Error(err);
  }

  const [ownExposure, err2] = await chaindata.getOwnExposure(
    activeEra,
    testValidator
  );
  if (err2) {
    throw new Error(err2);
  }

  const [hasThem, err3] = await chaindata.hasUnappliedSlashes(
    activeEra - 6,
    activeEra,
    testValidator
  );
  if (err3) {
    throw new Error(err3);
  }

  process.exit(0);
})();
