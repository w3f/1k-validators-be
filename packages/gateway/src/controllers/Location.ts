import { response } from "./index";
import * as LocationService from "../services/LocationService";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../run";
import { requestEmitter } from "../events/requestEmitter";

export default class LocationController {
  public static async getLocationCurrentValidatorSet(
    context: any,
  ): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed(300000)) {
      logger.info(
        `{Gateway} getLocationCurrentValidatorSet is cached`,
        gatewayLabel,
      );
      return;
    }
    response(
      context,
      200,
      await LocationService.getLocationCurrentValidatorSet(),
    );
  }

  public static async getValidatorLocation(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    const { address } = context.params;
    if (await context.cashed(300000)) {
      logger.info(`{Gateway} getValidatorLocation is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await LocationService.getValidatorLocation(address));
  }
}
