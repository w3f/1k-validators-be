import { queries, Config, logger } from "@1kv/common";
import { BaseContext } from "koa";

export const findAccounting = async function (stash: any): Promise<any> {
  let candidate;

  try {
    candidate = await queries.getAccounting(stash);
  } catch (error) {
    logger.error("findCandidate", { error });
  }

  return candidate;
};
