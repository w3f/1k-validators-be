import path from "path";
import fs from "fs";
import { getProdCandidateJSON } from "./candidate";

export const getKusamaProdConfig = () => {
  const candidatesJSON = getProdCandidateJSON();

  const jsonPath = path.resolve(
    __dirname,
    "../../../../packages/core/config/kusama.current.sample.json",
  );
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  const config = JSON.parse(jsonData);

  config.scorekeeper.candidates = candidatesJSON.candidates;

  config.scorekeeper.nominators = [
    [
      {
        // NOT A REAL SEED, TEST MNEMONIC
        seed: "raw security lady smoke fit video flat miracle change hurdle potato apple",
        isProxy: true,
        proxyFor: "DXCungXJNFY8qCycRFFVjvFJb2xmkLmyoDvJiEv8sF1dCha",
      },
    ],
  ];
  return config;
};
