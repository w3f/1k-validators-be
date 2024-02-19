import Chaindata, { chaindataLabel } from "../chaindata";
import logger from "../../logger";

export const getProxyAnnouncements = async (
  chaindata: Chaindata,
  address: string,
): Promise<any> => {
  try {
    await chaindata.checkApiConnection();
    const announcements =
      await chaindata.api.query.proxy.announcements(address);
    const json = announcements.toJSON()[0];
    return json.map((announcement) => {
      return {
        real: announcement.real,
        callHash: announcement.callHash,
        height: announcement.height,
      };
    });
  } catch (e) {
    logger.error(`Error getting proxy announcements: ${e}`, chaindataLabel);
  }
};
