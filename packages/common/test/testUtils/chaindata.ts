import { ChainData } from "../../src";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints, KusamaPeopleEndpoints } from "../../src/constants";

export async function getKusamaChainData(): Promise<ChainData> {
  const relayApiHandler = new ApiHandler(KusamaEndpoints);
  const peopleApiHandler = new ApiHandler(KusamaPeopleEndpoints);
  await Promise.all([relayApiHandler.getApi(), peopleApiHandler.getApi()]);

  return new ChainData({
    relay: relayApiHandler,
    people: peopleApiHandler,
  });
}
