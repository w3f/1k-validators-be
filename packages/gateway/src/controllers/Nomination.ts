import { logger } from "@1kv/common";
import { response } from "./index";
import * as NominationService from "../services/Nomination";
import { gatewayLabel } from "../constants";
import { requestEmitter } from "../events/requestEmitter";

export default class NominationController {
  public static async getNominations(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominations is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await NominationService.getNominations());
  }

  public static async getNominatorNominations(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominatorNominations is cached`, gatewayLabel);
      return;
    }
    const { address, last } = context.params;
    response(
      context,
      200,
      await NominationService.getNominatorNominations(address, last),
    );
  }

  public static async getLastNomination(context): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getLastNomination is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await NominationService.getLastNomination());
  }

  public static async getProxyTxs(context): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getProxyTxs is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await NominationService.getProxyTxs());
  }
}
