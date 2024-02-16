import { ApiHandler, ChainData, Constants } from "@1kv/common";
import { blake2AsHex } from "@polkadot/util-crypto";

describe("ChainData Integration Tests", () => {
  let handler: ApiHandler;
  let chaindata: ChainData;

  beforeAll(async () => {
    handler = new ApiHandler(Constants.KusamaEndpoints);
    await handler.setAPI();
    chaindata = new ChainData(handler);
  });

  test("Active Era Index should be a number", async () => {
    const [activeEra, eraErr] = await chaindata.getActiveEraIndex();
    expect(eraErr).toBeFalsy();
    expect(activeEra).toBeDefined();
    expect(typeof activeEra).toBe("number");
  }, 30000); // Extended timeout

  test("Validator Commission should be retrievable without errors", async () => {
    const api = await handler.getApi();
    const [activeEra, eraErr] = await chaindata.getActiveEraIndex();
    const entries = await api.query.staking.erasStakers.entries(activeEra);
    const validators = entries.map(([key]) => key.args[1]);
    const testValidator =
      validators.length > 0 ? validators[0].toString() : null;

    expect(testValidator).not.toBeNull();

    if (testValidator) {
      const [, err] = await chaindata.getCommission(testValidator);
      expect(err).toBeFalsy();
    }
  }, 30000); // Extended timeout

  test("Identity check should pass for validators with an identity", async () => {
    const [hasIdentity, isVerified] = await chaindata.hasIdentity(
      "D11XNhmwHJLtP18V3nGbS5dLZLpqf2ez65r3noiN2sEkKZz", // Example address, replace with a known identity-having address if outdated
    );
    expect(hasIdentity).toBeTruthy();
    expect(isVerified).toBeTruthy();
  }, 30000); // Extended timeout

  test("Identity check should fail for validators without an identity", async () => {
    const [hasIdentity, isVerified] = await chaindata.hasIdentity(
      "HqE13RoY1yntxvAvySn8ogit5XrX1EAxZe4HPPaFf48q8JM", // Example address, replace with a known non-identity address if outdated
    );
    expect(hasIdentity).toBeFalsy();
    expect(isVerified).toBeFalsy();
  }, 30000); // Extended timeout

  test("Identity strings and hashes should match for sub-identities", async () => {
    const identityString1 = await chaindata.getIdentity(
      "D11XNhmwHJLtP18V3nGbS5dLZLpqf2ez65r3noiN2sEkKZz", // Example address, replace if outdated
    );
    const hash1 = blake2AsHex(identityString1);

    const identityString2 = await chaindata.getIdentity(
      "FqfW96FuXRH7pRy9njeNSxu4CNoBM1hKnVAmNRrFrU2izwj", // Example sub-identity address, replace if outdated
    );
    const hash2 = blake2AsHex(identityString2);

    expect(hash1).toEqual(hash2);
  }, 30000); // Extended timeout
});

afterAll(async () => {
  // If there's a need to disconnect or cleanup resources, do it here
  // e.g., await handler.disconnectApi();
});
