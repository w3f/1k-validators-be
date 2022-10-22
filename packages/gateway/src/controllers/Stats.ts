import { queries } from "@1kv/common";
import { response } from "./index";
import * as StatsService from "../services/Stats";

export default class StatsController {
  public static async getLocationStats(context: any): Promise<void> {
    response(context, 200, await StatsService.getLocationStats());
  }

  public static async getSessionLocationStats(context: any): Promise<void> {
    const { session } = context.params;
    response(context, 200, await StatsService.getSessionLocationStats(session));
  }

  public static async getEraStats(context: any): Promise<void> {
    response(context, 200, await StatsService.getEraStats());
  }
}
