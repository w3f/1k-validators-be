import { response } from "./index";
import * as EraPointsService from "../services/EraPoints";
import { logger } from "@1kv/common";

export default class EraPointsController {
  public static async getEraPoints(context: any): Promise<any> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getEraPoints is cached`);
      return;
    }
    const { address, last } = context.params;
    response(context, 200, await EraPointsService.getEraPoints(address));
  }

  public static async getTotalEraPoints(context: any): Promise<any> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getTotalEraPoints is cached`);
      return;
    }
    response(context, 200, await EraPointsService.getTotalEraPoints());
  }
}
