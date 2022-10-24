import * as CandidateService from "../services/Candidate";
import { response } from "./index";

export default class CandidateController {
  public static async getCandidate(context: any): Promise<void> {
    const address = context.params.address;

    response(context, 200, await CandidateService.getCandidate(address));
  }

  public static async getCandidates(context: any): Promise<void> {
    response(context, 200, await CandidateService.getCandidates());
  }

  public static async getNodes(context: any): Promise<void> {
    response(context, 200, await CandidateService.getNodes());
  }

  public static async getLatestNominatorStake(context: any): Promise<void> {
    const address = context.params.address;

    response(
      context,
      200,
      await CandidateService.getLatestNominatorStake(address)
    );
  }

  public static async getEraNominatorStake(context: any): Promise<void> {
    const { address, era } = context.params;

    response(
      context,
      200,
      await CandidateService.getEraNominatorStake(address, era)
    );
  }

  public static async getLastNominatorStake(context: any): Promise<void> {
    const { address, limit } = context.params;

    response(
      context,
      200,
      await CandidateService.getNominatorStake(address, limit)
    );
  }
}
