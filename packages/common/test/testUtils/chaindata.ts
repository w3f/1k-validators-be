import { ChainData } from "../../src";
import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints, KusamaPeopleEndpoints } from "../../src/constants";

export async function getKusamaChainData(): Promise<ChainData> {
  const relayApiHandler = new ApiHandler("relay", KusamaEndpoints);
  const peopleApiHandler = new ApiHandler("people", KusamaPeopleEndpoints);
  await Promise.all([relayApiHandler.getApi(), peopleApiHandler.getApi()]);

  return new ChainData({
    relay: relayApiHandler,
    people: peopleApiHandler,
  });
}
