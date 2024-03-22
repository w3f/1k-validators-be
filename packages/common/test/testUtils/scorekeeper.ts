import { addProdKusamaCandidates } from "./candidate";
import { getKusamaProdConfig } from "./config";
import { ScoreKeeper } from "../../src";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints } from "../../src/constants";

export const getAndStartScorekeeper = async () => {
  const apiHandler = new ApiHandler(KusamaEndpoints);
  await apiHandler.setAPI();
  await apiHandler.getApi()?.isReady;
  let health = await apiHandler.healthCheck();
  while (!health) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    health = await apiHandler.healthCheck();
  }

  await addProdKusamaCandidates();

  const config = getKusamaProdConfig();

  const scorekeeper = new ScoreKeeper(apiHandler, config);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  const didStart = await scorekeeper.begin();

  let isStarted = scorekeeper.isStarted;
  while (!isStarted) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    isStarted = scorekeeper.isStarted;
  }
  return scorekeeper;
};
