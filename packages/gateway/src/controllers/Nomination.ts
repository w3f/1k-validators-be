import { logger, queries } from "@1kv/common";
import { response } from "./index";
import * as NominationService from "../services/Nomination";
import { getLastNomination } from "../services/Nomination";

export default class NominationController {
  public static async getNominations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominations is cached`);
      return;
    }
    response(context, 200, await NominationService.getNominations());
  }

  public static async getNominatorNominations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getNominatorNominations is cached`);
      return;
    }
    const { address, last } = context.params;
    response(
      context,
      200,
      await NominationService.getNominatorNominations(address, last)
    );
  }

  public static async getLastNomination(context): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLastNomination is cached`);
      return;
    }
    response(context, 200, await NominationService.getLastNomination());
  }

  public static async getProxyTxs(context): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getProxyTxs is cached`);
      return;
    }
    response(context, 200, await NominationService.getProxyTxs());
  }
}
