import { queries } from "@1kv/common";

export const getEraPoints = async (stash): Promise<any> => {
  const latestEra = (await queries.getLastTotalEraPoints())[0].era;
  const eraPoints = await queries.getHistoryDepthEraPoints(stash, latestEra);
  return eraPoints;
};

export const getTotalEraPoints = async (): Promise<any> => {
  const latestEra = (await queries.getLastTotalEraPoints())[0].era;
  let eras = await queries.getHistoryDepthTotalEraPoints(latestEra);
  eras = eras.map((era) => {
    return {
      era: era.era,
      totalEraPoints: era.totalEraPoints,
      min: era.min,
      max: era.max,
      average: era.average,
      median: era.median,
    };
  });
  return eras;
};
