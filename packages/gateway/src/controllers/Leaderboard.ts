import * as LeaderboardService from "../services/Leaderboard";

import { response } from "./index";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../constants";
import { requestEmitter } from "../events/requestEmitter";

export default class LeaderboardController {
  public static async getCandidatesWithRewards(context: any): Promise<void> {
    requestEmitter.emit("requestReceived");
    const { stash, page, limit } = context.query;

    if (await context.cashed()) {
      logger.info(`{Gateway} getCandidate is caced`, gatewayLabel);
      return;
    }

    response(
      context,
      200,
      await LeaderboardService.getCandidatesWithRewards(stash, page, limit),
    );
  }
  public static async getCandidateSearchSuggestion(
    context: any,
  ): Promise<void> {
    requestEmitter.emit("requestReceived");
    const { searchTerm } = context.params;
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getCandidateSearchSuggestion is cached`,
        gatewayLabel,
      );
      return;
    }

    response(
      context,
      200,
      await LeaderboardService.getCandidatesSearchSuggestion(searchTerm),
    );
  }
}
