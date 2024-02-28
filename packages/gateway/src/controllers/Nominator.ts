import { response } from "./index";
import * as NominatorService from "../services/Nominator";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../run";
import { requestEmitter } from "../events/requestEmitter";

export default class NominatorController {
  public static async getNominators(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominators is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await NominatorService.getNominators());
  }

  public static async getNominator(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominator is cached`, gatewayLabel);
      return;
    }
    const address = context.params.address;
    response(context, 200, await NominatorService.getNominator(address));
  }
}
