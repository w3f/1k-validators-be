import * as CandidateService from "../services/Candidate";
import { response } from "./index";

export default class CandidateController {
  public static async getCandidate(context: any): Promise<void> {
    const stash = context.params.stash;

    response(context, 200, await CandidateService.getCandidate(stash));
  }

  public static async getCandidates(context: any): Promise<void> {
    response(context, 200, await CandidateService.getCandidates());
  }

  public static async getNodes(context: any): Promise<void> {
    response(context, 200, await CandidateService.getNodes());
  }

  public static async getNominatorStake(context: any): Promise<void> {
    const address = context.params.stash;

    response(context, 200, await CandidateService.getNominatorStake(address));
  }
}
