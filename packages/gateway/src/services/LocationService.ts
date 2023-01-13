import { queries, logger } from "@1kv/common";

export const getValidatorLocation = async (address): Promise<any> => {
  const locations = await queries.getAllLocations(address);
  return locations;
};

export const getLocationCurrentValidatorSet = async (): Promise<any> => {
  const validators = await queries.getLatestValidatorSet();
  if (validators) {
    const addrs = await Promise.all(
      validators.validators.map(async (validatorAddress) => {
        const locations = await queries.getLocations(validatorAddress);
        return {
          address: validatorAddress,
          locations: locations
            ? locations.map((location) => {
                return {
                  name: location.name,
                  address: location.address,
                  city: location.city,
                  region: location.region,
                  country: location.country,
                  provider: location.provider,
                  updated: location.updated,
                  session: location.session,
                  source: location.source,
                };
              })
            : [],
        };
      })
    );
    return addrs;
  } else {
    return [];
  }
};

export const getHeartbeatIndex = async (): Promise<any> => {
  const index = await queries.getHeartbeatIndex();
  return {
    latest: index?.latest,
    earliest: index?.earliest,
    blocksIndexed: index?.latest - index?.earliest,
  };
};

export const getLatestScore = async (stash): Promise<any> => {
  const score = await queries.getLatestValidatorScore(stash);
  return score;
};

export const getScoreMetadata = async (session): Promise<any> => {
  const scoreMetadata = await queries.getValidatorScoreMetadata(session);
  return scoreMetadata;
};

export const getLatestScoreMetadata = async (): Promise<any> => {
  const scoreMetadata = await queries.getLatestValidatorScoreMetadata();
  return scoreMetadata;
};
