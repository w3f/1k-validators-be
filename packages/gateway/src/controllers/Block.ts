import { response } from "./index";
import { logger } from "@1kv/common";
import * as BlockService from "../services/Block";
import { requestEmitter } from "../events/requestEmitter";

const label = { label: "Gateway" };

export default class BlockController {
  public static async getBlockIndex(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getBlockIndex is cached`, label);
      return;
    }
    response(context, 200, await BlockService.getBlockIndex());
  }
}
