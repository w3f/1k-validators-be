// Create new Era Points records
import {
  EraPoints,
  EraPointsModel,
  TotalEraPoints,
  TotalEraPointsModel,
} from "../models";
import { getIdentityAddresses } from "./Candidate";
import { dbLabel } from "../index";
import logger from "../../logger";

export const setEraPoints = async (
  era: number,
  points: number,
  address: string,
): Promise<boolean> => {
  try {
    const data = await EraPointsModel.findOne({
      address: address,
      era: era,
    }).lean();

    // If they don't exist
    if (!data) {
      const eraPoints = new EraPointsModel({
        address: address,
        era: era,
        eraPoints: points,
      });

      await eraPoints.save();
      return true;
    }

    await EraPointsModel.findOneAndUpdate(
      {
        address: address,
        era: era,
      },
      {
        eraPoints: points,
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(`Error setting era points: ${e}`, dbLabel);
    return false;
  }
};

export const getEraPoints = async (
  era: number,
  address: string,
): Promise<EraPoints | null> => {
  return EraPointsModel.findOne({
    address: address,
    era: era,
  }).lean<EraPoints>();
};

// Creates new record of era points for all validators for an era
export const setTotalEraPoints = async (
  era: number,
  total: number,
  validators: { address: string; eraPoints: number }[],
): Promise<boolean> => {
  try {
    for (const validator of validators) {
      // Try setting the era points
      await setEraPoints(era, validator.eraPoints, validator.address);
    }

    // Check if a record already exists
    const data = await TotalEraPointsModel.findOne({
      era: era,
    }).lean();

    // If it exists and the total era points are the same, return
    if (!!data && data.totalEraPoints == total && data.median) return true;

    const points = [];
    for (const v of validators) {
      points.push(v.eraPoints);
    }

    // Find median, max, and average era points
    const getAverage = (list: number[]) =>
      list.reduce((prev, curr) => prev + curr) / list.length;

    // Calculate Median
    const getMedian = (array: number[]) => {
      // Check If Data Exists
      if (array.length >= 1) {
        // Sort Array
        array = array.sort((a, b) => {
          return a - b;
        });

        // Array Length: Even
        if (array.length % 2 === 0) {
          // Average Of Two Middle Numbers
          return (array[array.length / 2 - 1] + array[array.length / 2]) / 2;
        }
        // Array Length: Odd
        else {
          // Middle Number
          return array[(array.length - 1) / 2];
        }
      } else {
        // Error
        console.error("Error: Empty Array (calculateMedian)");
      }
    };

    const max = Math.max(...points);
    const min = Math.min(...points);
    const avg = getAverage(points);
    const median = getMedian(points);

    // If it doesn't exist, create it
    if (!data) {
      const totalEraPoints = new TotalEraPointsModel({
        era: era,
        totalEraPoints: total,
        validatorsEraPoints: validators,
        median: median,
        average: avg,
        max: max,
        min: min,
      });

      await totalEraPoints.save();
      return true;
    }

    // It exists, update it
    await TotalEraPointsModel.findOneAndUpdate(
      {
        era: era,
      },
      {
        totalEraPoints: total,
        validatorsEraPoints: validators,
        median: median,
        average: avg,
        max: max,
        min: min,
      },
    ).exec();
    return true;
  } catch (e) {
    logger.error(`Error setting total era points: ${e}`, dbLabel);
    return false;
  }
};

export const getTotalEraPoints = async (
  era: number,
): Promise<TotalEraPoints | null> => {
  return TotalEraPointsModel.findOne({
    era: era,
  }).lean<TotalEraPoints>();
};

export const getLastTotalEraPoints =
  async (): Promise<TotalEraPoints | null> => {
    const eraPoints = await TotalEraPointsModel.find({})
      .lean<TotalEraPoints>()
      .sort("-era")
      .limit(1);
    return eraPoints;
  };

export const getSpanEraPoints = async (
  address: string,
  currentEra: number,
): Promise<EraPoints[]> => {
  return await EraPointsModel.find({
    address: address,
    era: { $gte: currentEra - 27 },
  })
    .lean<EraPoints[]>()
    .exec();
};

// Gets the era points for a validator for the past 84 eras from a current era
export const getHistoryDepthEraPoints = async (
  address: string,
  currentEra: number,
): Promise<EraPoints[]> => {
  return await EraPointsModel.find({
    address: address,
    era: { $gte: currentEra - 83 },
  })
    .lean<EraPoints[]>()
    .exec();
};

export const getHistoryDepthTotalEraPoints = async (
  currentEra: number,
): Promise<EraPoints[]> => {
  return await TotalEraPointsModel.find({
    era: { $gte: currentEra - 83 },
  })
    .lean<EraPoints[]>()
    .exec();
};

export const getValidatorLastEraPoints = async (
  address: string,
): Promise<EraPoints | null> => {
  return await EraPointsModel.findOne({
    address: address,
  })
    .lean<EraPoints>()
    .sort("-era")
    .limit(1)
    .exec();
};

// Gets the number of eras a validator has era points for
export const getValidatorEraPointsCount = async (
  address: string,
): Promise<number> => {
  const eras = await EraPointsModel.find({
    address: address,
  })
    .lean()
    .exec();
  return eras?.length;
};

// Gets a list of the total count of era points for every identity that is a part of a validators super/sub identity
export const getIdentityValidatorEraPointsCount = async (
  address: string,
): Promise<{ address: string; eras: number }[]> => {
  const eraPointsList: { address: string; eras: number }[] = [];
  const identityAddresses: string[] = await getIdentityAddresses(address);
  for (const identityAddress of identityAddresses) {
    const eras = await getValidatorEraPointsCount(identityAddress);
    eraPointsList.push({ address: identityAddress, eras: eras });
  }
  return eraPointsList.sort((a, b) => b.eras - a.eras);
};

// For an identity, gets the identity with the most era points
export const getIdentityValidatorEraPointsCountMax = async (
  address: string,
): Promise<number> => {
  const identityEras: { address: string; eras: number }[] =
    await getIdentityValidatorEraPointsCount(address);
  const maxEras: number = Math.max(...identityEras.map((entry) => entry.eras));
  return maxEras || 0;
};
