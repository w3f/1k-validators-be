import { response } from "./index";
import * as NominatorService from "../services/Nominator";

export default class NominatorController {
  public static async getNominators(context: any): Promise<void> {
    response(context, 200, await NominatorService.getNominators());
  }

  public static async getNominator(context: any): Promise<void> {
    const stash = context.params.stash;
    response(context, 200, await NominatorService.getNominator(stash));
  }
}
