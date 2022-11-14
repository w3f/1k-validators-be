import { CandidateModel, IITModel, LocationModel } from "../models";
import { fetchLocationInfo } from "../../util";
import { logger } from "../../index";

export const getLocation = async (name: string, addr: string): Promise<any> => {
  let data;
  // First try to get by telemetry name
  data = await LocationModel.findOne({
    addr,
  })
    .lean()
    .exec();
  if (!data) {
    data = await LocationModel.findOne({
      name,
    })
      .lean()
      .exec();
  }
  return data;
};

export const setLocation = async (
  name: string,
  addr: string,
  city: string,
  region: string,
  country: string,
  provider: string,
  port?: number
): Promise<any> => {
  // Try and find an existing record
  let data;
  data = await LocationModel.findOne({
    name,
  }).lean();
  if (!data) {
    data = await LocationModel.findOne({
      addr,
    }).lean();
  }

  if (!data || data?.addr != addr || data?.city != city) {
    const location = new LocationModel({
      name,
      addr,
      city,
      region,
      country,
      provider,
      port,
      updated: Date.now(),
    });
    return location.save();
  }
};

// Sets a location from heartbeats
export const setHeartbeatLocation = async (
  name: string,
  address: string, // Validator Stash Address
  addr: string,
  port: number
): Promise<any> => {
  // Try and find an existing record
  const data = await LocationModel.findOne({
    addr,
  }).lean();

  // Location doesn't exist, fetch it
  if (!data) {
    logger.info(`querying imonline heartbeat location`);
    const iit = await getIIT();
    const { city, region, country, provider } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );
    const candidate = await CandidateModel.find({ stash: address })
      .select({ name: 1, stash: 1 })
      .lean();

    // @ts-ignore
    const candidateName = candidate?.name ? candidate?.name : name;

    const location = new LocationModel({
      name: candidateName,
      address,
      addr,
      city,
      region,
      country,
      provider,
      port,
      updated: Date.now(),
    });
    return location.save();
  } else if (data.addr != addr || data.port != port) {
    // the record exists, but has a different address or port - update it
    logger.info(`updating location from imoneline heartbeat`);

    const iit = await getIIT();
    const { city, region, country, provider } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );
    const candidate = await CandidateModel.find({ stash: address })
      .select({ name: 1, stash: 1 })
      .lean();

    // @ts-ignore
    const candidateName = candidate?.name ? candidate?.name : name;

    await LocationModel.findOneAndUpdate(
      { addr },
      {
        name: candidateName,
        address,
        addr,
        city,
        region,
        country,
        provider,
        port,
        updated: Date.now(),
      }
    ).exec();
  }
};

export const getIIT = async (): Promise<any> => {
  return IITModel.findOne({}).lean().exec();
};
