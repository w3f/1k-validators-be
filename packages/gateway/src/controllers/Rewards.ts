import { response } from "./index";
import * as RewardsService from "../services/Rewards";
import { logger } from "@1kv/common";

const label = { label: "Gateway" };

export default class RewardsController {
  public static async getRewardsValidatorTotal(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsValidatorTotal is cached`, label);
      return;
    }
    response(
      context,
      200,
      await RewardsService.getRewardsValidatorTotal(context.params.address),
    );
  }

  public static async getRewardsAllValidatorsTotal(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsAllValidatorsTotal is cached`, label);
      return;
    }
    response(context, 200, await RewardsService.getRewardsAllValidatorsTotal());
  }

  public static async getRewardsValidatorStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsValidatorStats is cached`, label);
      return;
    }
    response(
      context,
      200,
      await RewardsService.getRewardsValidatorStats(context.params.address),
    );
  }

  public static async getRewardsAllValidatorStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsAllValidatorStats is cached`, label);
      return;
    }
    response(context, 200, await RewardsService.getRewardsAllValidatorsStats());
  }

  public static async getRewardsNominatorTotal(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsNominatorTotal is cached`, label);
      return;
    }
    response(
      context,
      200,
      await RewardsService.getRewardsNominatorTotal(context.params.address),
    );
  }

  public static async getRewardsAllNominatorsTotal(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsAllNominatorsTotal is cached`, label);
      return;
    }
    response(context, 200, await RewardsService.getRewardsAllNominatorsTotal());
  }

  public static async getRewardsValidator(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsValidator is cached`, label);
      return;
    }
    response(
      context,
      200,
      await RewardsService.getRewardsValidator(context.params.address),
    );
  }

  public static async getRewardsNominator(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`getRewardsNominator is cached`, label);
      return;
    }
    response(
      context,
      200,
      await RewardsService.getRewardsNominator(context.params.address),
    );
  }
}
