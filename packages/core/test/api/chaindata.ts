import ChainData from "../../src/chaindata";
import ApiHandler from "../../src/ApiHandler";
import { KusamaEndpoints } from "../../src/constants";
import { OTV } from "../../src/constraints";

import { blake2AsHex } from "@polkadot/util-crypto";

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
    "HqE13RoY1yntxvAvySn8ogit5XrX1EAxZe4HPPaFf48q8JM"
  );
  if (doesNotHaveIdentity || notVerified) {
    throw new Error("Does not have identity");
  }

  // sub-identity
  const [subIdentity, subVerified] = await chaindata.hasIdentity(
    "FqfW96FuXRH7pRy9njeNSxu4CNoBM1hKnVAmNRrFrU2izwj"
  );
  if (!subIdentity || !subVerified) {
    throw new Error("Sub identity doesn't work.");
  }

  const identityString = await chaindata.getIdentity(
    "D11XNhmwHJLtP18V3nGbS5dLZLpqf2ez65r3noiN2sEkKZz"
  );
  const hash = blake2AsHex(identityString);

  const subIdentityString = await chaindata.getIdentity(
    "FqfW96FuXRH7pRy9njeNSxu4CNoBM1hKnVAmNRrFrU2izwj"
  );
  const hash2 = blake2AsHex(subIdentityString);

  if (hash !== hash2) {
    throw new Error("identity hashes should match");
  }

  const constraints = new OTV(handler, false, false, false, 0, 0);

  const candidates = [
    {
      name: "LetzBake!",
      stash: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
      riotHandle: "@marc1104:matrix.org",
      sentryId: "QmdpRp4GZuNhWYKmCHmejrjGJzscgKkGB9KVecoPmPPaKj",
    },
    {
      name: "🎠 Forbole GP01 🇭🇰",
      stash: "D9rwRxuG8xm8TZf5tgkbPxhhTJK5frCJU9wvp59VRjcMkUf",
      riotHandle: "@kwunyeung:matrix.org",
      sentryId: "QmaqXZfUWezxCSPjCxgwYdqPxknGCrk4fkhquG11ghfxyX",
    },
    {
      name: "🔱-Masternode24-🔱",
      stash: "FyRaMYvPqpNGq6PFGCcUWcJJWKgEz29ZFbdsnoNAczC2wJZ",
      riotHandle: "@alexkidd:matrix.org",
      sentryId: "QmWKyEyTp8XFJT6rS5hdfUTsJHGV5X66LeXYhbXi6PL5xy",
    },
    {
      name: "Anonstake",
      stash: "J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D",
      riotHandle: "@anon2020:matrix.org",
      sentryId: [
        "QmPr2sykAydTitadF71Td62MZzNnhUC9Cy6JBCk9tNzsVL",
        "QmQ8dcwPhZ3SA1JhLav9enhQnhJF96CBt8qLsFJLTej8hd",
      ],
    },
    {
      name: "Anson&Fabio-sv-public-1",
      stash: "CmD9vaMYoiKe7HiFnfkftwvhKbxN9bhyjcDrfFRGbifJEG8",
      riotHandle: ["@anson:web3.foundation", "@fabio:web3.foundation"],
      sentryId: [
        "Qmf1BCcgXn7gwDoajWJ98hSPv98UbnCzBTvvtcAYoq2Ngo",
        "QmT4vBTsnqYsV4YxaYzXXuXM7jwdSdM5s9gRcapkJpwwjA",
      ],
    },
  ];

  const hashTable = await constraints.populateIdentityHashTable(
    candidates as any
  );

  console.log("NO ERRORS!");
  process.exit(0);
})();
