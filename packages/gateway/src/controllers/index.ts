import { BaseContext } from "koa";
export * from "./Candidate";
export * from "./Accounting";
export * from "./EraPoints";

export const response = (
  context: BaseContext,
  status: number,
  body?: Record<string, any> | string | Array<Record<string, any>>
): void => {
  context.status = status;
  context.body = body;
};
