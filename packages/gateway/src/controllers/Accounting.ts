import * as AccountingService from "../services/Accounting";
import { response } from "./index";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../run";
import { requestEmitter } from "../events/requestEmitter";

export default class AccountingController {
  public static async getAccounting(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getAccounting is cached`, gatewayLabel);
      return;
    }
    const address = context.params.address;

    response(context, 200, await AccountingService.findAccounting(address));
  }
}
