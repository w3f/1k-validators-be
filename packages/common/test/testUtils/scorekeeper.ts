import { addProdKusamaCandidates } from "./candidate";
import { getKusamaProdConfig } from "./config";
import { ScoreKeeper } from "../../src";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints } from "../../src/constants";

export const getAndStartScorekeeper = async () => {
  const apiHandler = new ApiHandler(KusamaEndpoints);
  await apiHandler.initiateConnection();
  await apiHandler.getApi()?.isReady;
  let health = await apiHandler.healthCheck();
  while (!health) {
    console.log("API is not ready, retrying in 5 seconds");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    health = await apiHandler.healthCheck();
  }

  await addProdKusamaCandidates();

  const config = getKusamaProdConfig();
  console.log("got config");

  console.log(JSON.stringify(config));

  const scorekeeper = new ScoreKeeper(apiHandler, config);
  for (const nominatorGroup of config.scorekeeper.nominators) {
    await scorekeeper.addNominatorGroup(nominatorGroup);
  }

  console.log(`nominator groups added beginning scorekeeper....`);
  const didStart = await scorekeeper.begin();
  console.log("did start:");
  console.log(didStart);
  console.log("yes");

  console.log("scorekeeper has begun");
  let isStarted = scorekeeper.isStarted;
  while (!isStarted) {
    console.log("waiting for scorekeeper to start...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    isStarted = scorekeeper.isStarted;
  }
  return scorekeeper;
};
