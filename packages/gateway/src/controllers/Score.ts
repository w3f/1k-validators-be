import { response } from "./index";
import * as ScoreService from "../services/Score";

export default class ScoreController {
  public static async getScore(context: any): Promise<void> {
    const { stash } = context.params;
    response(context, 200, await ScoreService.getScore(stash));
  }

  public static async getScoreMetadata(context: any): Promise<void> {
    response(context, 200, await ScoreService.getScoreMetadata());
  }
}
