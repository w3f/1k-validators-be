import { response } from "./index";
import * as ScoreService from "../services/Score";
import { logger } from "@1kv/common";

export default class ScoreController {
  public static async getSessionScore(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getSessionScore is cached`);
      return;
    }
    const { address, session } = context.params;
    response(context, 200, await ScoreService.getScore(address, session));
  }

  public static async getScore(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getScore is cached`);
      return;
    }
    const { address } = context.params;
    response(context, 200, await ScoreService.getLatestScore(address));
  }

  public static async getSessionScoreMetadata(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getSessionScoreMetadata is cached`);
      return;
    }
    const { session } = context.params;
    response(context, 200, await ScoreService.getScoreMetadata(session));
  }

  public static async getLatestScoreMetadata(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLatestScoreMetadata is cached`);
      return;
    }
    response(context, 200, await ScoreService.getLatestScoreMetadata());
  }
}
