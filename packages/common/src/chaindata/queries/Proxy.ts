import { ChainData, chaindataLabel } from "../chaindata";
import logger from "../../logger";

export interface ProxyAnnouncement {
  real: string;
  callHash: string;
  height: number;
}

export const getProxyAnnouncements = async (
  chaindata: ChainData,
  address: string,
): Promise<ProxyAnnouncement[]> => {
  try {
    await chaindata.checkApiConnection();
    const announcements =
      await chaindata.api.query.proxy.announcements(address);
    const json = announcements.toJSON();

    // Check if the json variable is an array of objects
    if (
      Array.isArray(json) &&
      json.every((item) => typeof item === "object" && item !== null)
    ) {
      // Map the json array to ProxyAnnouncement objects
      return json.map((announcement: any) => ({
        real: announcement.real,
        callHash: announcement.callHash,
        height: announcement.height,
      }));
    } else {
      // Log an error and return an empty array if the format is unexpected
      logger.warn("Unexpected format for proxy announcements", chaindataLabel);
      return [];
    }
  } catch (e) {
    // Log an error and return an empty array if an error occurs
    logger.error(`Error getting proxy announcements: ${e}`, chaindataLabel);
    return [];
  }
};
