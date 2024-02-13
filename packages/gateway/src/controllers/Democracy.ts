import { response } from "./index";
import * as DemocracyService from "../services/Democracy";
import { logger } from "@1kv/common";
import { gatewayLabel } from "../run";

export default class DemocracyController {
  public static async getElectionStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getElectionStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getLatestElectionStats());
  }

  public static async getCouncillors(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCouncillors is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getCouncillors());
  }

  public static async getCouncillor(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getCouncillors is cached`, gatewayLabel);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getCouncillor(address));
  }

  public static async getVoters(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getVoters is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getVoters());
  }

  public static async getDelegations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getDelegations is cached`, gatewayLabel);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getDelegations(address));
  }

  public static async getAllDelegations(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getAllDelegations is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getAllDelegations());
  }

  public static async getAddressConvictionVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getAddressConvictionVotes is cached`,
        gatewayLabel,
      );
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getAddressConvictionVotes(address),
    );
  }

  public static async getAddressFinishedConvictionVotes(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getAddressFinishedConvictionVotes is cached`,
        gatewayLabel,
      );
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getAddressFinishedConvictionVotes(address),
    );
  }

  public static async getAddressTrackConvictionVotes(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getAddressTrackConvictionVotes is cached`,
        gatewayLabel,
      );
      return;
    }
    const { address, track } = context.params;
    response(
      context,
      200,
      await DemocracyService.getAddressTrackConvictionVotes(address, track),
    );
  }

  public static async getTrackConvictionVotes(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getTrackConvictionVotes is cached`, gatewayLabel);
      return;
    }
    const { track } = context.params;
    response(
      context,
      200,
      await DemocracyService.getTrackConvictionVotes(track),
    );
  }

  public static async getReferendumConvictionVotes(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getReferendumConvictionVotes is cached`,
        gatewayLabel,
      );
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getReferendumConvictionVotes(index),
    );
  }

  public static async getOpenGovAddressDelegations(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getOpenGovAddressDelegations is cached`,
        gatewayLabel,
      );
      return;
    }
    const { address } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovAddressDelegations(address),
    );
  }

  public static async getOpenGovDelegates(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovDelegates is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovDelegates());
  }

  public static async getOpenGovDelegate(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovDelegates is cached`, gatewayLabel);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getOpenGovDelegate(address));
  }

  public static async getOpenGovTracks(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovTracks is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovTracks());
  }

  public static async getOpenGovVoters(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovVoters is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovVoters());
  }

  public static async getOpenGovVoter(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovVoter is cached`, gatewayLabel);
      return;
    }
    const { address } = context.params;
    response(context, 200, await DemocracyService.getOpenGovVoter(address));
  }

  public static async getOpenGovReferenda(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovReferenda());
  }

  public static async getOpenGovReferendaIndex(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`, gatewayLabel);
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendaIndex(Number(index)),
    );
  }

  public static async getOpenGovReferendaStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(`{Gateway} getOpenGovReferendaStats is cached`, gatewayLabel);
      return;
    }
    response(context, 200, await DemocracyService.getOpenGovReferendaStats());
  }

  public static async getOpenGovReferendumStats(context: any): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getOpenGovReferendumStats is cached`,
        gatewayLabel,
      );
      return;
    }
    const { index } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendumStats(index),
    );
  }

  public static async getOpenGovReferendumStatsSegment(
    context: any,
  ): Promise<void> {
    if (await context.cashed()) {
      logger.info(
        `{Gateway} getOpenGovReferendumStats is cached`,
        gatewayLabel,
      );
      return;
    }
    const { index, segment } = context.params;
    response(
      context,
      200,
      await DemocracyService.getOpenGovReferendumStatsSegment(index, segment),
    );
  }
}
