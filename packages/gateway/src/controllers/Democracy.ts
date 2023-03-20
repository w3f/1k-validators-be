import { response } from "./index";
import * as DemocracyService from "../services/Democracy";
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

  public static async getAddressConvictionVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAddressConvictionVotes is cached`);
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getAddressConvictionVotes(address)
    );
  }

  public static async getAddressTrackConvictionVotes(
    context: any
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAddressTrackConvictionVotes is cached`);
      return;
    }
    const { address, track } = context.params;
    response(
      context,
      200,
      await DemocracyService.getAddressTrackConvictionVotes(address, track)
    );
  }

  public static async getTrackConvictionVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getTrackConvictionVotes is cached`);
      return;
    }
    const { track } = context.params;
    response(
      context,
      200,
      await DemocracyService.getTrackConvictionVotes(track)
    );
  }

  public static async getReferendumConvictionVotes(
    context: any
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getReferendumConvictionVotes is cached`);
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getReferendumConvictionVotes(index)
    );
  }

  public static async getOpenGovAddressDelegations(
    context: any
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovAddressDelegations is cached`);
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovAddressDelegations(address)
    );
  }

  public static async getOpenGovDelegates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovDelegates is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovDelegates());
  }

  public static async getOpenGovDelegate(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovDelegates is cached`);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getOpenGovDelegate(address));
  }

  public static async getOpenGovTracks(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovTracks is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovTracks());
  }

  public static async getOpenGovVoters(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovVoters is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovVoters());
  }

  public static async getOpenGovVoter(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovVoter is cached`);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getOpenGovVoter(address));
  }

  public static async getOpenGovReferenda(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovReferenda());
  }

  public static async getOpenGovReferendaIndex(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`);
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendaIndex(Number(index))
    );
  }

  public static async getOpenGovReferendaStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovReferendaStats());
  }

  public static async getOpenGovReferendumStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendumStats is cached`);
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendumStats(index)
    );
  }

  public static async getOpenGovReferendumStatsSegment(
    context: any
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendumStats is cached`);
      return;
    }
    const { index, segment } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendumStatsSegment(index, segment)
    );
  }
}
