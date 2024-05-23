/**
 * Functions for registering events from the ApiHandler
 *
 * @function RegisterHandler
 */
import { ApiHandler, ChainData, Config, logger, queries } from "../index";
import { scorekeeperLabel } from "./scorekeeper";

export const registerAPIHandler = (
  handler: ApiHandler,
  config: Config.ConfigSchema,
  chaindata: ChainData,
  bot: any,
): void => {
  // Handles offline event. Validators will be faulted for each session they are offline
  //     If they have already reaceived an offline fault for that session, it is skipped
  handler.on("someOffline", async (data: { offlineVals: string[] }) => {
    const { offlineVals } = data;
    const session = (await chaindata.getSession()) || 0;
    for (const val of offlineVals) {
      const candidate = await queries.getCandidateByStash(val);
      if (!candidate) return;
      const reason = `${candidate.name} had an offline event in session ${
        session - 1
      }`;
      let alreadyFaulted = false;
      for (const fault of candidate.faultEvents) {
        if (fault.reason === reason) {
          alreadyFaulted = true;
        }
      }
      if (alreadyFaulted) continue;

      logger.info(`Some offline: ${reason}`, scorekeeperLabel);
      await bot?.sendMessage(reason);

      await queries.pushFaultEvent(candidate.stash, reason);
    }
  });

  handler.on("newSession", async (data: { sessionIndex: string }) => {
    const { sessionIndex } = data;
    logger.info(`New Session Event: ${sessionIndex}`, scorekeeperLabel);
  });
};
