import ChainData from "../../src/chaindata";
import ApiHandler from "../../src/ApiHandler";

(async () => {
  const handler = await ApiHandler.create();
  const api = await handler.getApi();
  const chaindata = new ChainData(handler);

  const [activeEra, eraErr] = await chaindata.getActiveEraIndex();
  if (eraErr) {
    throw eraErr;
  }

  const entries = await api.query.staking.erasStakers.entries(activeEra);
  const validators = entries.map(([key]) => key.args[1]);

  const testValidator = validators[1].toString();

  const [, err] = await chaindata.getCommission(testValidator);
  if (err) {
    throw new Error(err);
  }

  const [, err2] = await chaindata.getOwnExposure(activeEra, testValidator);
  if (err2) {
    throw new Error(err2);
  }

  const [, err3] = await chaindata.hasUnappliedSlashes(
    activeEra - 6,
    activeEra,
    testValidator
  );
  if (err3) {
    throw new Error(err3);
  }

  const [, err4] = await chaindata.findEraBlockHash(activeEra - 3);
  if (err4) {
    throw new Error(err4);
  }

  const [, err5] = await chaindata.activeValidatorsInPeriod(
    activeEra - 3,
    activeEra
  );
  if (err5) {
    throw new Error(err5);
  }

  console.log("NO ERRORS!");
  // process.exit(0);
})();
