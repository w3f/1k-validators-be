import Nominator from "../../src/nominator/nominator";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { NominatorConfig } from "../../src/types";

describe("Nominator Integration Test", () => {
  const nominators: Nominator[] = [];
  let handler: ApiHandler;

  const nom1 = {
    stash: "G1rrUNQSk7CjjEmLSGcpNu72tVtyzbWdUvgmSer9eBitXWf",
    bondedAddress: "H9BFvNPTqDEmWZ63M82ohrFmvEFASm25ErUMzmXDrbAr1kq",
  };
  const nom2 = {
    stash: "JLENz97TFT2kYaQmyCSEnBsK8VhaDZNmYATfsLCHyLF6Gzu",
    bondedAddress: "G1Y1bvviE3VpDTm2dERe5xGiU2izNcJwYNHx95RJhqoWqqm",
  };
  const nom3 = {
    stash: "HgTtJusFEn2gmMmB5wmJDnMRXKD6dzqCpNR7a99kkQ7BNvX",
    bondedAddress: "H4UgNEEN92YXz96AyQgwkJQSpXGdptYLkj9jXVKrNXjQHRJ",
  };
  const nom4 = {
    stash: "EX9uchmfeSqKTM7cMMg8DkH49XV8i4R7a7rqCn8btpZBHDP",
    bondedAddress: "H54GA3nq3xeNrdbHkepAufSPMjaCxxkmfej4PosqD84bY3V",
  };
  const nom5 = {
    stash: "GZPJSqoN3u49yyAZfcxtfHxBDrvxJ79BfZe2Q9aQvv2HrAN",
    bondedAddress: "GZPJSqoN3u49yyAZfcxtfHxBDrvxJ79BfZe2Q9aQvv2HrAN",
  };
  const nom6 = {
    stash: "GtRQd4YsEJiHWyWws5yBCMLhWPTUELHVQEDFRCvfPMfnWKW",
    bondedAddress: "GtRQd4YsEJiHWyWws5yBCMLhWPTUELHVQEDFRCvfPMfnWKW",
  };
  const nom7 = {
    stash: "JLQDhDpU3Z1uUfdMQUoKXambPuDsYFdbcZybDF2yME8aVNa",
    bondedAddress: "JLQDhDpU3Z1uUfdMQUoKXambPuDsYFdbcZybDF2yME8aVNa",
  };
  const nom8 = {
    stash: "HbU6yWNQp188SsrKtfrq9ZzJFhjjQisyFjcVxRp25ZPrB8M",
    bondedAddress: "HbU6yWNQp188SsrKtfrq9ZzJFhjjQisyFjcVxRp25ZPrB8M",
  };
  const nom9 = {
    stash: "CfrvyqdQZSaQdvFvjEv9Rbyi225PmTefffqteNvSTCJg3Vq",
    bondedAddress: "CfrvyqdQZSaQdvFvjEv9Rbyi225PmTefffqteNvSTCJg3Vq",
  };
  const nom10 = {
    stash: "EPVX8ZxarAfG4o9PN6yUnkSaP4jA3b6Nj6irnDApixMMeWY",
    bondedAddress: "EPVX8ZxarAfG4o9PN6yUnkSaP4jA3b6Nj6irnDApixMMeWY",
  };
  const nom11 = {
    stash: "HgujxWHszAvuTfqfqXAxKE69XkMRtvhF8StRTVAFK6uwAZS",
    bondedAddress: "HgujxWHszAvuTfqfqXAxKE69XkMRtvhF8StRTVAFK6uwAZS",
  };
  const nom12 = {
    stash: "G2s9C6arpTHUVASRYU8vBCxEyTDYj1mQcKu3LioyRsRpHNV",
    bondedAddress: "G2s9C6arpTHUVASRYU8vBCxEyTDYj1mQcKu3LioyRsRpHNV",
  };
  const nom13 = {
    stash: "HChjf62FddBkgfkYMr5E2ejjAeRNEsXDZC677JKgMhxeBBW",
    bondedAddress: "HChjf62FddBkgfkYMr5E2ejjAeRNEsXDZC677JKgMhxeBBW",
  };
  const nom14 = {
    stash: "H4635Bjj3X7TjnQhd55p9DyFPK39JiRypmCnsDhS3NHSMS5",
    bondedAddress: "H4635Bjj3X7TjnQhd55p9DyFPK39JiRypmCnsDhS3NHSMS5",
  };
  const nom15 = {
    stash: "HxRmQTVrMxMkhyZquYLu2hSL1QDYvVwSpDfBHvVJhEMVzRj",
    bondedAddress: "HxRmQTVrMxMkhyZquYLu2hSL1QDYvVwSpDfBHvVJhEMVzRj",
  };
  const nom16 = {
    stash: "FiWi4ufpytpMM3ivqfL3fE1j4jgyGLCJCspt24uJsXtUfiJ",
    bondedAddress: "FiWi4ufpytpMM3ivqfL3fE1j4jgyGLCJCspt24uJsXtUfiJ",
  };
  const nom17 = {
    stash: "GZgn2Styf1XN2UzDL2amMxMZ5BZsbe8oJ6gmTN2DLBMkoNV",
    bondedAddress: "GZgn2Styf1XN2UzDL2amMxMZ5BZsbe8oJ6gmTN2DLBMkoNV",
  };
  const nom18 = {
    stash: "DXCungXJNFY8qCycRFFVjvFJb2xmkLmyoDvJiEv8sF1dCha",
    bondedAddress: "DXCungXJNFY8qCycRFFVjvFJb2xmkLmyoDvJiEv8sF1dCha",
  };

  // NOT A REAL SEED, TEST MNEMONIC
  const seed =
    "raw security lady smoke fit video flat miracle change hurdle potato apple";

  const nominatorConfigs: NominatorConfig[] = [
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom1.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom2.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom3.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom4.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom5.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom6.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom7.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom8.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom9.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom11.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom10.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom12.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom13.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom14.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom15.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom16.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom17.bondedAddress,
    },
    {
      seed: seed,
      isProxy: true,
      proxyFor: nom18.bondedAddress,
    },
  ];

  beforeEach(async () => {
    handler = new ApiHandler(["wss://kusama-rpc.polkadot.io"]);
    await handler.setAPI();
  });

  it("should have a status defined", async () => {
    for (const config of nominatorConfigs) {
      nominators.push(new Nominator(handler, config, 2, null));
    }

    for (const nominator of nominators) {
      const status = await nominator.init();
      expect(nominator.status).toBeDefined();
    }
  }, 300000);
});
