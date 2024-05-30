import { addProdKusamaCandidates } from "./candidate";
import { getKusamaProdConfig } from "./config";
import { ChainData, ScoreKeeper } from "../../src";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints, KusamaPeopleEndpoints } from "../../src/constants";

export const getAndStartScorekeeper = async () => {
  const relayApiHandler = new ApiHandler(KusamaEndpoints);
  const peopleApiHandler = new ApiHandler(KusamaPeopleEndpoints);
  await Promise.all([relayApiHandler.getApi(), peopleApiHandler.getApi()]);

  const chaindata = new ChainData({
    relay: relayApiHandler,
    people: peopleApiHandler,
  });

  await addProdKusamaCandidates();

  const config = getKusamaProdConfig();

  const scorekeeper = new ScoreKeeper(chaindata, config);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  await scorekeeper.begin();

  let isStarted = scorekeeper.isStarted;
  while (!isStarted) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    isStarted = scorekeeper.isStarted;
  }
  return scorekeeper;
};
