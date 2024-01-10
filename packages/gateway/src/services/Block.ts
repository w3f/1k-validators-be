import { queries } from "@1kv/common";

export const getBlockIndex = async (): Promise<any> => {
  const index = await queries.getBlockIndex();
  return {
    latest: index?.latest,
    earliest: index?.earliest,
    blocksIndexed: index?.latest - index?.earliest,
  };
};
