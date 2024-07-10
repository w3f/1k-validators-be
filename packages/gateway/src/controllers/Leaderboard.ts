import * as LeaderboardService from "../services/Leaderboard";

import { response } from "./index";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../constants";
import { requestEmitter } from "../events/requestEmitter";

export default class LeaderboardController {
  public static async getCandidatesWithRewards(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    if (await context.cashed()) {
      logger.info(`{Gateway} getCandidate is cached`, gatewayLabel);
      return;
    }

    response(context, 200, await LeaderboardService.getCandidatesWithRewards());
  }

}
