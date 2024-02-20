import { CandidateModel, IITModel, LocationModel } from "../models";
import { logger } from "../../index";
import { getLatestSession } from "./Session";
import { getCandidate } from "./Candidate";
import { HardwareSpec } from "../../types";

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
  if (locations.length == 0) {
    const candidate = await getCandidate(address);
    if (candidate) {
      const location = getCandidateLocation(candidate.name);
      return location;
    }
  }
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
    .sort("-updated")
    .limit(1)
    .exec();
  if (!data || data.length == 0) {
    data = await LocationModel.find({
      name,
    })
      .lean()
      .sort("-updated")
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
  } else {
    return data[0];
  }
};

export const setLocation = async (
  name: string,
  addr: string,
  city: string,
  region: string,
  country: string,
  provider: string,
  hardwareSpec: HardwareSpec,
  v?: boolean,
  port?: number,
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
      cpu: hardwareSpec?.cpu,
      memory: hardwareSpec?.memory,
      coreCount: hardwareSpec?.core_count,
      vm: hardwareSpec?.is_virtual_machine,
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
      },
    ).exec();
  }
};

export const cleanBlankLocations = async (): Promise<any> => {
  return await LocationModel.deleteMany({
    $or: [{ city: "None" }, { addr: "" }],
  }).exec();
};

// Sets a location from heartbeats

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
