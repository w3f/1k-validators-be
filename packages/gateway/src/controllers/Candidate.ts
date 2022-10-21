import { BaseContext } from "koa";
import * as CandidateService from "../services/Candidate";

export default class CandidateController {
  public static async getCandidate(context: any): Promise<void> {
    // await ValidationService.validateRequest(
    //   context,
    //   { _id: context.params.id },
    //   requestValidationSchema,
    //   ["_id"]
    // );

    response(
      context,
      200,
      await CandidateService.findCandidate(context, context.params.stash)
    );
  }
}

export const response = (
  context: BaseContext,
  status: number,
  body?: Record<string, any> | string | Array<Record<string, any>>
): void => {
  context.status = status;
  context.body = body;
};
