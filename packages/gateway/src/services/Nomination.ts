import { queries } from "@1kv/common";

export const getNominations = async (): Promise<any> => {
  const allNominations = await queries.allNominations();
  return allNominations;
};

export const getNominatorNominations = async (
  address: string,
  last = 30
): Promise<any> => {
  const nominations = await queries.getLastNominations(
    address,
    last ? Number(last) : 30
  );
};

export const getLastNomination = async (): Promise<any> => {
  const lastNomination = await queries.getLastNominatedEraIndex();
  return lastNomination;
};

export const getProxyTxs = async (): Promise<any> => {
  const proxyTxs = await queries.getAllDelayedTxs();
  return proxyTxs;
};
