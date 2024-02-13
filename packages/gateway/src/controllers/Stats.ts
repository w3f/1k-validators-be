import { logger } from "@1kv/common";
import { response } from "./index";
import * as StatsService from "../services/Stats";
import { gatewayLabel } from "../run";

export default class StatsController {
  public static async getLocationStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLocationStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await StatsService.getLocationStats());
  }

  public static async getValidLocationStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLocationStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await StatsService.getValidLocationStats());
  }

  public static async getSessionLocationStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getSessionLocationStats is cached`, gatewayLabel);
      return;
    }
    const { session } = context.params;
    response(context, 200, await StatsService.getSessionLocationStats(session));
  }

  public static async getEraStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getEraStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await StatsService.getEraStats());
  }
}
