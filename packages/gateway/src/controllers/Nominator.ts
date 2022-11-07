import { response } from "./index";
import * as NominatorService from "../services/Nominator";
import { logger } from "@1kv/common";

export default class NominatorController {
  public static async getNominators(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominators is cached`);
      return;
    }
    response(context, 200, await NominatorService.getNominators());
  }

  public static async getNominator(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominator is cached`);
      return;
    }
    const address = context.params.address;
    response(context, 200, await NominatorService.getNominator(address));
  }
}
