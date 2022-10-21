import { queries, Config, logger } from "@1kv/common";
import { BaseContext } from "koa";

export const findCandidate = async function (
  context: BaseContext,
  stash: any
): Promise<any> {
  let candidate;

  try {
    candidate = await queries.getCandidate(stash);
  } catch (error) {
    logger.error("findCandidate", { error });
  }

  return candidate;
};
