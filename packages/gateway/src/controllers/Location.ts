import { response } from "./index";
import * as LocationService from "../services/LocationService";
import { logger } from "@1kv/common";
import { getValidatorLocation } from "../services/LocationService";

export default class LocationController {
  public static async getLocationCurrentValidatorSet(
    context: any
  ): Promise<void> {
    if (await context.cashed(300000)) {
      logger.info(`{Gateway} getLocationCurrentValidatorSet is cached`);
      return;
    }
    response(
      context,
      200,
      await LocationService.getLocationCurrentValidatorSet()
    );
  }

  public static async getValidatorLocation(context: any): Promise<void> {
    const { address } = context.params;
    if (await context.cashed(300000)) {
      logger.info(`{Gateway} getValidatorLocation is cached`);
      return;
    }
    response(context, 200, await LocationService.getValidatorLocation(address));
  }

  public static async getHeartbeatIndex(context: any): Promise<void> {
    const { address } = context.params;
    if (await context.cashed(300)) {
      logger.info(`{Gateway} getHeartbeatIndex is cached`);
      return;
    }
    response(context, 200, await LocationService.getHeartbeatIndex());
  }

  // public static async getScore(context: any): Promise<void> {
  //   if (await context.cashed()) {
  //     logger.info(`{Gateway} getScore is cached`);
  //     return;
  //   }
  //   const { address } = context.params;
  //   response(context, 200, await ScoreService.getLatestScore(address));
  // }
  //
  // public static async getSessionScoreMetadata(context: any): Promise<void> {
  //   if (await context.cashed()) {
  //     logger.info(`{Gateway} getSessionScoreMetadata is cached`);
  //     return;
  //   }
  //   const { session } = context.params;
  //   response(context, 200, await ScoreService.getScoreMetadata(session));
  // }
  //
  // public static async getLatestScoreMetadata(context: any): Promise<void> {
  //   if (await context.cashed()) {
  //     logger.info(`{Gateway} getLatestScoreMetadata is cached`);
  //     return;
  //   }
  //   response(context, 200, await ScoreService.getLatestScoreMetadata());
  // }
}
