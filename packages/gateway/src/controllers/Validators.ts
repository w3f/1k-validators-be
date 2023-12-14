import { response } from "./index";
import * as ValidatorService from "../services/Validator";
import { logger } from "@1kv/common";

const label = { label: "Gateway" };

export default class ValidatorController {
  public static async getLatestValidatorSet(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominators is cached`);
      return;
    }
    response(context, 200, await ValidatorService.getLatestValidatorSet());
  }

  public static async getValidators(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getValdiators is cached`, label);
      return;
    }
    response(context, 200, await ValidatorService.getValidators());
  }

  public static async getValidator(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getValdiator is cached`, label);
      return;
    }
    response(
      context,
      200,
      await ValidatorService.getValidator(context.params.address)
    );
  }
}
