import { BaseContext } from "koa";
import * as AccountingService from "../services/Accounting";
import { response } from "./index";
import { logger } from "@1kv/common";

export default class AccountingController {
  public static async getAccounting(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAccounting is cached`);
      return;
    }
    const address = context.params.address;

    response(context, 200, await AccountingService.findAccounting(address));
  }
}
