import { CandidateModel, IITModel, LocationModel } from "../models";
import { fetchLocationInfo } from "../../util";
import { logger } from "../../index";
import { getLatestSession } from "./Session";

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
  if (!data) {
    data = await LocationModel.findOne({
      name,
    })
      .lean()
      .sort("-session")
      .limit(1)
      .exec();
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
  const candidate = await CandidateModel.findOne({ name: name })
    .select({ name: 1, stash: 1 })
    .lean();

  const candidateAddress = candidate?.stash ? candidate?.stash : "";

  if (!data || data?.addr != addr || data?.city != city) {
    logger.info(`Creating new location model, data doesnt exist`, {
      label: "Location",
    });
    const location = new LocationModel({
      address: candidateAddress,
      name,
      addr,
      city,
      region,
      country,
      provider,
      port,
      session: session || 0,
      updated: Date.now(),
      source: "Telemetry",
    });
    return location.save();
  } else if (data.session != session || data.address != candidateAddress) {
    logger.info(
      `Updating location model, session: ${data.sesssion != session} address: ${
        data.address != candidateAddress
      }`,
      { label: "Location" }
    );
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
  port: number
): Promise<any> => {
  // Try and find an existing record
  const data = await LocationModel.findOne({
    addr,
  }).lean();

  const session = (await getLatestSession())?.session;

  // Location doesn't exist, fetch it
  if (!data) {
    logger.info(
      `Imoneline heartbeat doesn't exist for session ${session}, querying`,
      { label: "Location" }
    );
    const iit = await getIIT();
    const { city, region, country, provider } = await fetchLocationInfo(
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
      session: session || 0,
      updated: Date.now(),
      source: "Heartbeat",
    });
    return location.save();
  } else if (data.addr != addr) {
    // the record exists, but has a different address or port - update it
    logger.info(`updating location from imoneline heartbeat`, {
      label: "Location",
    });
    logger.info(
      `data addr: ${data.addr} addr: ${addr} data port: ${data.port} port: ${port}`,
      { label: "Location" }
    );

    const iit = await getIIT();
    const { city, region, country, provider } = await fetchLocationInfo(
      addr,
      iit && iit.iit ? iit.iit : null
    );
    const candidate = await CandidateModel.findOne({ stash: address })
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
        session: session || 0,
        updated: Date.now(),
        source: "Heartbeat",
      }
    ).exec();
  } else if (data.port != port) {
    logger.info(`port is different: ${data.port} ${port}`, {
      label: "Location",
    });
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
