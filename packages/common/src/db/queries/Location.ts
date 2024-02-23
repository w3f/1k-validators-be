import {
  CandidateModel,
  IITModel,
  IITRequestCounterModel,
  Location,
  LocationModel,
} from "../models";
import { logger } from "../../index";
import { getLatestSession } from "./Session";
import { getCandidate } from "./Candidate";
import { HardwareSpec } from "../../types";
import { dbLabel } from "../index";

export const getAllLocations = async (address: string): Promise<Location[]> => {
  const locations = await LocationModel.find({ address })
    .sort({ updated: -1 })
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
    .lean<Location[]>();
  if (locations.length > 0) {
    return locations;
  }
  const candidate = await getCandidate(address);
  if (candidate) {
    const location = await getCandidateLocation(candidate.name);
    return location ? [location] : [];
  }
  return [];
};

// Get all the locations that belongs to an on-chain stash address, ordered by updated
export const getLocations = async (address: string): Promise<Location[]> => {
  return LocationModel.find({ address })
    .sort({ updated: -1 })
    .lean<Location[]>();
};

// Returns a single location object for a given telemetry name or ip address of the most recent session
// Note: there may be multiple ip addresses, this will only return one of them
export const getLocation = async (
  name: string,
  addr: string,
): Promise<Location> => {
  return LocationModel.findOne({
    $or: [{ addr }, { name }],
  })
    .sort({ updated: -1 })
    .lean<Location>();
};

export const getCandidateLocation = async (
  name: string,
): Promise<Location | null> => {
  const data = await LocationModel.findOne({ name })
    .sort({ updated: -1 })
    .lean<Location>();

  if (!data) {
    logger.warn(`Location: can't find location for ${name}`, dbLabel);
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
  hardwareSpec: HardwareSpec,
  v?: boolean,
  port?: number,
): Promise<boolean> => {
  try {
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
      await location.save();
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
    return true;
  } catch (e) {
    logger.error(e.toString());
    logger.error(`Error setting location`, dbLabel);
    return false;
  }
};

export const cleanBlankLocations = async (): Promise<any> => {
  return await LocationModel.deleteMany({
    $or: [{ city: "None" }, { addr: "" }],
  }).exec();
};

// Sets a location from heartbeats

export const iitExists = async (): Promise<any> => {
  return IITModel.exists({});
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

export const removeIIT = async (): Promise<any> => {
  try {
    return IITModel.deleteOne({}).exec();
  } catch (e) {
    logger.error(e.toString());
    logger.error(`Error deleting IIT`, dbLabel);
    return false;
  }
};

export const updateIITRequestCount = async (): Promise<any> => {
  try {
    const updateResult = await IITRequestCounterModel.findOneAndUpdate(
      {},
      {
        $inc: { requestCount: 1 },
        $setOnInsert: { firstRequest: Date.now() },
        $set: { lastRequest: Date.now() },
      },
      {
        new: true,
        upsert: true,
      },
    ).exec();

    return updateResult;
  } catch (e) {
    logger.error(e.toString());
    logger.error("Error updating IIT request count", dbLabel);
    return false;
  }
};
