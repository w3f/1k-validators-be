import { response } from "./index";
import { logger } from "@1kv/common";
import * as BlockService from "../services/Block";

const label = { label: "Gateway" };

export default class BlockController {
  public static async getBlockIndex(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getBlockIndex is cached`, label);
      return;
    }
    response(context, 200, await BlockService.getBlockIndex());
  }
}
