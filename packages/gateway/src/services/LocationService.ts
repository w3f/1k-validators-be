import { queries } from "@1kv/common";

export const getValidatorLocation = async (address): Promise<any> => {
  const candidate = await queries.getCandidateByStash(address);
  const locations = await queries.getCandidateLocation(candidate?.slotId);
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
      }),
    );
    return addrs;
  } else {
    return [];
  }
};
