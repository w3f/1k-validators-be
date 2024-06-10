import { response } from "./index";
import * as ValidatorService from "../services/Validator";
import { logger } from "@1kv/common";
import { requestEmitter } from "../events/requestEmitter";
import { gatewayLabel } from "../constants";

export default class ValidatorController {
  public static async getLatestValidatorSet(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominators is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await ValidatorService.getLatestValidatorSet());
  }

  public static async getValidators(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getValdiators is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await ValidatorService.getValidators());
  }

  public static async getValidator(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getValdiator is cached`, gatewayLabel);
      return;
    }
    response(
      context,
      200,
      await ValidatorService.getValidator(context.params.address),
    );
  }

  public static async getBeefyStats(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getBeefyStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await ValidatorService.getBeefyStats());
  }

  public static async getBeefyDummy(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getBeefyDummy is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await ValidatorService.getBeefyDummy());
  }

  public static async getValidatorsNumActiveEras(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`getValidatorsNumActiveEras is cached`, gatewayLabel);
      return;
    }
    response(
      context,
      200,
      await ValidatorService.getValidatorsNumActiveEras(context.params.address),
    );
  }
}
