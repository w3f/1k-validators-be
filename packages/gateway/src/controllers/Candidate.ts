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

  public static async getNominatorStake(context: any): Promise<void> {
    const address = context.params.address;

    response(context, 200, await CandidateService.getNominatorStake(address));
  }
}
