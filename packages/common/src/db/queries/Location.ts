import { IITModel, LocationModel } from "../models";

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
  asn: string,
  provider: string
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
      asn,
      provider,
      updated: Date.now(),
    });
    return location.save();
  }
};

export const getIIT = async (): Promise<any> => {
  return IITModel.findOne({}).lean().exec();
};
