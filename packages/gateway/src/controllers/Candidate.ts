import * as CandidateService from "../services/Candidate";
import { response } from "./index";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../run";

export default class CandidateController {
  public static async getCandidate(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCandidate is cached`, gatewayLabel);
      return;
    }
    const address = context.params.address;

    response(context, 200, await CandidateService.getCandidate(address));
  }

  public static async getValidCandidates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getValidCandidates is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await CandidateService.getValidCandidates());
  }

  public static async getInvalidCandidates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getInvalidCandidates is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await CandidateService.getInvalidCandidates());
  }

  public static async getCandidates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCandidates is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await CandidateService.getCandidates());
  }

  public static async getRankCandidates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCandidates is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await CandidateService.getRankCandidates());
  }

  public static async getLatestNominatorStake(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLatestNominatorStake is cached`, gatewayLabel);
      return;
    }

    const address = context.params.address;

    response(
      context,
      200,
      await CandidateService.getLatestNominatorStake(address),
    );
  }

  public static async getEraNominatorStake(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getEraNominatorStake is cached`, gatewayLabel);
      return;
    }
    const { address, era } = context.params;

    response(
      context,
      200,
      await CandidateService.getEraNominatorStake(address, era),
    );
  }

  public static async getLastNominatorStake(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLastNominatorStake is cached`, gatewayLabel);
      return;
    }
    const { address, limit } = context.params;

    response(
      context,
      200,
      await CandidateService.getNominatorStake(address, limit),
    );
  }
}
