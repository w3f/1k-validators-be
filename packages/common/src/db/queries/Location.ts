import {
  CandidateModel,
  HeartbeatIndex,
  HeartbeatIndexModel,
  IITModel,
  LocationModel,
} from "../models";
import { fetchLocationInfo } from "../../util";
import { logger } from "../../index";
import { getLatestSession } from "./Session";

export const getAllLocations = async (address: string): Promise<any> => {
  const locations = await LocationModel.find({
    address,
  })
    .sort("-session")
    .select({
      session: 1,
      name: 1,
      address: 1,
      city: 1,
      region: 1,
      country: 1,
      provider: 1,
      updated: 1,
      source: 1,
    })
    .lean()
    .exec();
  return locations;
};

export const getLocations = async (address: string): Promise<any> => {
  // Try to find if there's a latest session
  const latestSession = await LocationModel.find({
    address,
  })
    .sort("-session")
    .select({ session: 1 })
    .limit(1)
    .lean()
    .exec();
  if (latestSession[0]) {
    const locations = await LocationModel.find({
      address: address,
      session: latestSession[0].session,
    })
      .lean()
      .exec();
    return locations;
  } else {
  }
};

// Returns a single location object for a given telemetry name or ip address of the most recent session
// Note: there may be multiple ip addresses, this will only return one of them
export const getLocation = async (name: string, addr: string): Promise<any> => {
  let data;
  // First try to get by telemetry name
  data = await LocationModel.find({
    addr,
  })
    .lean()
    .sort("-session")
    .limit(1)
    .exec();
  if (!data || data.length == 0) {
    data = await LocationModel.findOne({
      name,
    })
      .lean()
      .sort("-session")
      .limit(1)
      .exec();
  }
  if (data && data[0]) {
    return data[0];
  }
};

export const getCandidateLocation = async (name: string): Promise<any> => {
  // First try to get by telemetry name
  const data = await LocationModel.find({
    name,
  })
    .lean()
    .sort("-session")
    .limit(1)
    .exec();
  if (!data) {
    logger.warn(`Location: can't find location for ${name}`);
  }
  return data[0];
};

export const setLocation = async (
  name: string,
  addr: string,
  city: string,
  region: string,
  country: string,
  provider: string,
  v?: boolean,
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

  const session = (await getLatestSession())?.session;
  if (session && session == 0) {
    return;
  }

  const candidate = await CandidateModel.findOne({ name: name })
    .select({ name: 1, stash: 1 })
    .lean();

  const candidateAddress = candidate?.stash ? candidate?.stash : "";

  if (!data || data?.addr != addr || data?.city != city) {
    const location = new LocationModel({
      address: candidateAddress,
      name,
      addr,
      city,
      region,
      country,
      provider,
      port,
      vpn: v,
      session: session || 0,
      updated: Date.now(),
      source: "Telemetry",
    });
    return location.save();
  } else if (data.session != session || data.address != candidateAddress) {
    await LocationModel.findOneAndUpdate(
      { addr, name },
      {
        address: candidateAddress,
        addr,
        city,
        region,
        country,
        provider,
        port,
        vpn: v,
        session: session || 0,
        updated: Date.now(),
        source: "Telemetry",
      }
    ).exec();
  }
};

// Sets a location from heartbeats
export const setHeartbeatLocation = async (
  name: string,
  address: string, // Validator Stash Address
  addr: string,
  port: number,
  session: number
): Promise<any> => {
  // Try and find an existing record
  const data = await LocationModel.findOne({
    addr,
  }).lean();

  // Location doesn't exist, fetch it
  if (!data) {
    const iit = await getIIT();
    const { city, region, country, provider, v } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );
    const candidate = await CandidateModel.findOne({ stash: address })
      .select({ name: 1, stash: 1 })
      .lean();

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
      vpn: v,
      session: session || 0,
      updated: Date.now(),
      source: "Heartbeat",
    });
    return location.save();
  } else if (data.addr != addr) {
    // the record exists, but has a different address or port - update it

    const iit = await getIIT();
    const { city, region, country, provider } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );
    const candidate = await CandidateModel.findOne({ stash: address })
      .select({ name: 1, stash: 1 })
      .lean();

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
        session: session || 0,
        updated: Date.now(),
        source: "Heartbeat",
      }
    ).exec();
  } else if (data.port != port) {
    const location = new LocationModel({
      name: data.name,
      address,
      addr,
      city: data.city,
      region: data.region,
      country: data.country,
      provider: data.provider,
      port,
      session,
      updated: Date.now(),
      source: "Heartbeat",
    });
  }
};

export const getIIT = async (): Promise<any> => {
  return IITModel.findOne({}).lean().exec();
};

export const setIIT = async (accessToken: string): Promise<any> => {
  const exists = await IITModel.findOne({ iit: accessToken }).exec();
  if (!exists) {
    const token = await new IITModel({ iit: accessToken });
    await token.save();
    return;
  } else {
    await IITModel.findOneAndUpdate({
      iit: accessToken,
    }).exec();
  }
};

export const getHeartbeatIndex = async () => {
  return await HeartbeatIndexModel.findOne({}).exec();
};

export const setHeartbeatIndex = async (
  earliest: number,
  latest: number
): Promise<any> => {
  const exists = await HeartbeatIndexModel.findOne({}).exec();
  if (!exists) {
    const data = await new HeartbeatIndexModel({
      earliest: earliest,
      latest: latest,
    });
    return data.save();
  }
  if (earliest < exists.earliest) {
    await HeartbeatIndexModel.findOneAndUpdate(
      {},
      { earliest: earliest }
    ).exec();
  }
  if (latest > exists.latest) {
    await HeartbeatIndexModel.findOneAndUpdate({}, { latest: latest }).exec();
  }
};
