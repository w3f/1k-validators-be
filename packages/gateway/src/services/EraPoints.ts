import { queries } from "@1kv/common";

export const getEraPoints = async (stash): Promise<any> => {
  const latestEra = (await queries.getLastTotalEraPoints())[0].era;
  const eraPoints = await queries.getHistoryDepthEraPoints(stash, latestEra);
  return eraPoints;
};

export const getTotalEraPoints = async (): Promise<any> => {
  const latestEra = (await queries.getLastTotalEraPoints())[0].era;
  return await queries.getHistoryDepthTotalEraPoints(latestEra);
};
