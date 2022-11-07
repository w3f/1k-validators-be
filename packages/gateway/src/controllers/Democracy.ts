import { response } from "./index";
import * as DemocracyService from "../services/Democracy";
import {
  getReferendumAccountVotes,
  getReferendumIndexVotes,
} from "../services/Democracy";
import { logger } from "@1kv/common";

export default class DemocracyController {
  public static async getElectionStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getElectionStats is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getLatestElectionStats());
  }

  public static async getCouncillors(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCouncillors is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getCouncillors());
  }

  public static async getCouncillor(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCouncillors is cached`);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getCouncillor(address));
  }

  public static async getVoters(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getVoters is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getVoters());
  }

  public static async getAllReferenda(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAllReferenda is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getAllReferenda());
  }

  public static async getReferendum(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getReferendum is cached`);
      return;
    }
    const { index } = context.params;
    response(context, 200, await DemocracyService.getReferendum(index));
  }

  public static async getLastReferendum(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLastReferendum is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getLastReferendum());
  }

  public static async getLastReferendums(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getLastReferendums is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getLastReferendums());
  }

  public static async getReferendumIndexVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getReferendumIndexVotes is cached`);
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getReferendumIndexVotes(index)
    );
  }

  public static async getReferendumAccountVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getReferendumAccountVotes is cached`);
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getReferendumAccountVotes(address)
    );
  }

  public static async getDelegations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getDelegations is cached`);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getDelegations(address));
  }

  public static async getAllDelegations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAllDelegations is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getAllDelegations());
  }
}
