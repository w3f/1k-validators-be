import { queries } from "@1kv/common";

export const getScore = async (stash): Promise<any> => {
  const score = await queries.getValidatorScore(stash);
  return score;
};

export const getScoreMetadata = async (): Promise<any> => {
  const scoreMetadata = await queries.getValidatorScoreMetadata();
  return scoreMetadata;
};
