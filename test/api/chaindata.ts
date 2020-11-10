import ChainData from "../../src/chaindata";
import ApiHandler from "../../src/ApiHandler";
import { KusamaEndpoints } from "../../src/constants";

(async () => {
  const handler = await ApiHandler.create(KusamaEndpoints);
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

  const [doesHaveIdentity, isVerified] = await chaindata.hasIdentity(
    "D11XNhmwHJLtP18V3nGbS5dLZLpqf2ez65r3noiN2sEkKZz"
  );
  if (!doesHaveIdentity || !isVerified) {
    throw new Error("Does have an identity.");
  }

  const [doesNotHaveIdentity, notVerified] = await chaindata.hasIdentity(
    "FqfW96FuXRH7pRy9njeNSxu4CNoBM1hKnVAmNRrFrU2izwj"
  );
  if (doesNotHaveIdentity || notVerified) {
    throw new Error("Does not have identity");
  }

  console.log("NO ERRORS!");
  process.exit(0);
})();
