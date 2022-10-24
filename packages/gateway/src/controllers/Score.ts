import { response } from "./index";
import * as ScoreService from "../services/Score";

export default class ScoreController {
  public static async getSessionScore(context: any): Promise<void> {
    const { address, session } = context.params;
    response(context, 200, await ScoreService.getScore(address, session));
  }

  public static async getScore(context: any): Promise<void> {
    const { address } = context.params;
    response(context, 200, await ScoreService.getLatestScore(address));
  }

  public static async getSessionScoreMetadata(context: any): Promise<void> {
    const { session } = context.params;
    response(context, 200, await ScoreService.getScoreMetadata(session));
  }

  public static async getLatestScoreMetadata(context: any): Promise<void> {
    response(context, 200, await ScoreService.getLatestScoreMetadata());
  }
}
