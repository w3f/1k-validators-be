import { response } from "./index";
import * as ValidatorService from "../services/Validator";
import { logger } from "@1kv/common";

export default class ValidatorController {
  public static async getLatestValidatorSet(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominators is cached`);
      return;
    }
    response(context, 200, await ValidatorService.getLatestValidatorSet());
  }
}
