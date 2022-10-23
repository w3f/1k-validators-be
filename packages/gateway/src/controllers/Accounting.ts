import { BaseContext } from "koa";
import * as AccountingService from "../services/Accounting";
import { response } from "./index";

export default class AccountingController {
  public static async getAccounting(context: any): Promise<void> {
    const address = context.params.address;

    response(context, 200, await AccountingService.findAccounting(address));
  }
}
