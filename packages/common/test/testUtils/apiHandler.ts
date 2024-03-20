import ApiHandler from "../../src/ApiHandler/ApiHandler";
import { KusamaEndpoints } from "../../src/constants";

export const getKusamaHandler = async () => {
  const apiHandler = new ApiHandler(KusamaEndpoints);
  await apiHandler.initiateConnection();
  await apiHandler.getApi()?.isReady;
  let health = await apiHandler.healthCheck();
  while (!health) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    health = await apiHandler.healthCheck();
  }
  return apiHandler;
};
