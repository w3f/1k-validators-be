// Remove id fields on returned objects
import { MongoMemoryServer } from "mongodb-memory-server";
import { Db } from "../../src";
import mongoose from "mongoose";

export const omitId = (obj: any) => {
  if (Array.isArray(obj)) {
    // Recursively apply omitId to each item in the array
    return obj.map((item: any) => omitId(item));
  } else if (obj && typeof obj === "object") {
    // Omit _id field if obj is an object
    const { _id, __v, ...rest } = obj;
    return rest;
  }
  return obj;
};

export const omitUpdated = (obj: any) => {
  if (Array.isArray(obj)) {
    // Recursively apply omitUpdated to each item in the array
    return obj.map((item: any) => omitUpdated(item));
  } else if (obj && typeof obj === "object") {
    // Omit "updated" field if obj is an object
    const { updated, ...rest } = obj;
    return rest;
  }
  return obj;
};

export const omitFields = (obj: any, fieldsToOmit: string | string[]): any => {
  if (Array.isArray(obj)) {
    // Recursively apply omitFields to each item in the array
    return obj.map((item: any) => omitFields(item, fieldsToOmit));
  } else if (obj && typeof obj === "object") {
    // Omit specified fields if obj is an object
    const filteredObj: any = {};
    for (const key in obj) {
      if (!fieldsToOmit.includes(key)) {
        filteredObj[key] = obj[key];
      }
    }
    return filteredObj;
  }
  return obj;
};

export const sortByKey = (obj: any[], key: string) => {
  if (Array.isArray(obj)) {
    // Sort the array of objects by the specified key
    return obj.sort((a, b) => {
      if (a[key] < b[key]) {
        return -1;
      }
      if (a[key] > b[key]) {
        return 1;
      }
      return 0;
    });
  }
  return obj;
};

export const createTestServer = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await Db.create(mongoUri);
  return mongoServer;
};

export const initTestServerBeforeAll = () => {
  let mongoServer;
  beforeAll(async () => {
    mongoServer = await createTestServer();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
};
