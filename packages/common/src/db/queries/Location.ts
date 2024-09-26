import {
  IITModel,
  IITRequestCounterModel,
  Location,
  LocationModel,
} from "../models";
import { logger } from "../../index";
import { getLatestSession } from "./Session";
import { HardwareSpec } from "../../types";
import { dbLabel } from "../index";
import { TWO_DAYS_IN_MS } from "../../constants";

export const getAllLocations = async (): Promise<Location[]> => {
  return LocationModel.find({}).lean<Location[]>();
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
): Promise<Location | null> => {
  return LocationModel.findOne({
    $or: [{ addr }, { name }],
  })
    .sort({ updated: -1 })
    .lean<Location>();
};

export const getCandidateLocation = async (
  slotId: number,
): Promise<Location | null> => {
  const query = [{ slotId: slotId }];

  return LocationModel.findOne({ $or: query })
    .sort({ updated: -1 })
    .lean<Location>();
};

export const setLocation = async (
  slotId: number,
  stash: string,
  name: string,
  addr: string,
  city: string,
  region: string,
  country: string,
  provider: string,
  hardwareSpec: HardwareSpec,
  networkId?: string,
  v?: boolean,
  port?: number,
): Promise<boolean> => {
  try {
    if (slotId == undefined || !stash) {
      logger.error(`No slotId  or stash found for ${name}`, {
        label: "Telemetry",
      });
      return false;
    }
    // Try and find an existing record
    const query = {
      $or: [{ slotId }],
    };
    const data = await LocationModel.findOne(query).lean<Location>();

    const session = (await getLatestSession())?.session;
    if (session && session == 0) {
      return false;
    }

    // Create a new Location record if there is no existing record, or there is a different ip address
    // TODO: check if we need multiple addresses to be stored
    if (!data || data?.addr != addr) {
      const location = new LocationModel({
        slotId: slotId,
        address: stash,
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
        networkId: networkId,
      });
      await location.save();
    } else {
      await LocationModel.findOneAndUpdate(
        { slotId },
        {
          slotId: slotId,
          address: stash,
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
          networkId: networkId,
        },
      ).exec();
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error setting location`, dbLabel);
    return false;
  }
};

export const cleanBlankLocations = async (): Promise<any> => {
  return await LocationModel.deleteMany({
    $or: [{ city: "None" }, { addr: "" }],
  }).exec();
};

// Remove all location data older than two days
export const cleanOldLocations = async (): Promise<boolean> => {
  const twoDaysAgo = Date.now() - TWO_DAYS_IN_MS;

  try {
    await LocationModel.deleteMany({ updated: { $lt: twoDaysAgo } }).exec();
    return true;
  } catch (error) {
    logger.info(
      `Error cleaning old locations: ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
};

export const cleanLocationsWithoutSlotId = async (): Promise<boolean> => {
  try {
    await LocationModel.deleteMany({ slotId: { $exists: false } }).exec();
    return true;
  } catch (error) {
    logger.error(
      `Error deleting locations without 'slotId': ${JSON.stringify(error)}`,
      dbLabel,
    );
    return false;
  }
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
    logger.error(JSON.stringify(e));
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
    logger.error(JSON.stringify(e));
    logger.error("Error updating IIT request count", dbLabel);
    return false;
  }
};
