import { ChainData, handleError } from "../chaindata";

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
    if (!(await chaindata.checkApiConnection())) {
      return [];
    }
    const announcements =
      await chaindata.api?.query.proxy.announcements(address);
    if (!announcements) {
      return [];
    }
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
      return [];
    }
  } catch (e) {
    await handleError(chaindata, e, "getProxyAnnouncements");
    return [];
  }
};
