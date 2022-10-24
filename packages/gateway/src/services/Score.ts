import { queries } from "@1kv/common";

export const getScore = async (stash, session): Promise<any> => {
  const score = await queries.getValidatorScore(stash, session);
  return score;
};

export const getLatestScore = async (stash): Promise<any> => {
  const score = await queries.getLatestValidatorScore(stash);
  return score;
};

export const getScoreMetadata = async (): Promise<any> => {
  const scoreMetadata = await queries.getValidatorScoreMetadata();
  return scoreMetadata;
};
