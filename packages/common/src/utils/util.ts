import Keyring from "@polkadot/keyring";
import { ConfigSchema } from "../config";
import logger from "../logger";
import { LOCATION_URL } from "../constants";
import { ApiPromise } from "@polkadot/api";
import { format } from "date-fns";
import axios from "axios";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });

export const getNow = (): number => new Date().getTime();

// Converts raw decimal to human readible format
//     - Test Net: 10 Decimals
//     - Polkadot: 10 Decimals
//     - Kusama: 12 Decimals
export const toDecimals = (raw: number, networkDecimals: number): number => {
  return raw / Math.pow(10, networkDecimals);
};

export const formatAddress = (
  address: string,
  config: ConfigSchema,
): string => {
  const keyring = new Keyring();
  const ss58Prefix = config.global.networkPrefix;
  return keyring.encodeAddress(address, ss58Prefix);
};

export const hex2a = (hex: string | null | undefined) => {
  if (hex) {
    return decodeURIComponent("%" + hex.match(/.{1,2}/g)!.join("%"));
  }
  return null;
};

export const addressUrl = (address: string, config: ConfigSchema) => {
  return `<a href="https://explorer.testnet.analog.one/#/validator/${address}">${address}</a>`;
};

export const fetchLocationInfo = async (addr: any, iit: any) => {
  const blank = {
    city: "None",
    region: "None",
    country: "None",
    provider: "None",
    v: false,
  };
  if (!iit || !addr) {
    if (!iit) {
      logger.warn(
        `Tried to query location data, but ipinfo api token not set`,
        { label: "Location" },
      );
    }
    if (!addr) {
      logger.warn("No address to query location info for", {
        label: "Location",
      });
    }
    return blank;
  }
  let json;
  try {
    const url = `${LOCATION_URL}${addr}?${iit}`;
    const response = await axios.get(url);
    json = response.data;
  } catch (e) {
    logger.info(`There was an error fetching location data....`);
    logger.info(e);
    return blank;
  }
  if (json.bogon) {
    logger.info(`Bogon IP address detected. Skipping...`, {
      label: "Location",
    });
    return blank;
  }

  try {
    //@ts-ignore
    // const { city, region, country, loc, org, postal, timezone } = json;
    const {
      city,
      region,
      country,
      asn: { name: providerName, domain, route, type },
      privacy: { vpn, proxy, tor, relay, hosting },
    } = json;

    return {
      city: city,
      region: region,
      country: country,
      provider: providerName,
      v: vpn,
    };
  } catch (e) {
    logger.info(`There was an error fetching location data....`);
    logger.info(e);
    return blank;
  }
};

// Convert a string of bits from MSB ordering to LSB ordering
export const toLSB = (msb: string): string => {
  const ar = msb.match(/.{1,8}/g);
  if (ar) {
    const lsb = ar.map((byte: string) => {
      const reverse = byte.split("").reverse().join("");
      return reverse;
    });
    return lsb.join("");
  } else {
    return "";
  }
};

// # HELPER
// lookup which validators were assigned in a group to a parachain
export const getGroup = (
  paraId: number,
  scheduledAvailabilityCores: any,
  validatorGroups: any,
  valIndices: string[],
  paraValIndices: number[],
) => {
  // console.log(`searching for para: ${paraId}`);
  const core = scheduledAvailabilityCores.find((core: any) => {
    return core.paraId == paraId;
  });
  if (!core) {
    console.log(`no paraId found for ${paraId}. Skipping`);
    return;
  }
  return validatorGroups[core.groupIdx].map((validatorIdx: number) => {
    return getParaValIndex(validatorIdx, valIndices, paraValIndices);
  });
};

// Lookup the para val index from the list of validators and para validators
export const getParaValIndex = (
  index: number,
  valIndices: string[],
  paraValIndices: number[],
) => {
  return valIndices[paraValIndices[index]];
};

// Get the validator indices in a given group
export const getGroupIndices = (groupIdx: any) => {
  const arr = [];
  for (let x = 0; x < 5; x++) {
    const y = groupIdx * 5 + x;
    arr.push(y);
  }
  return arr;
};

// Given a validator index, get the group it belongs to
export const getGroupIdx = (valIndex: any) => {
  let count = 0;
  for (let x = 0; x <= valIndex; x += 5) {
    ++count;
  }
  return count - 1;
};

// given a block, get it's timestamp inherent
export const getTimestamp = (block: any) => {
  let timestamp = 0;
  const extrinsics = block.block.extrinsics;
  for (const extrinsic of extrinsics) {
    const decoded = extrinsic.toHuman();
    //@ts-ignore
    const {
      isSigned,
      signer,
      method: { args, method: palletMethod, section },
    } = decoded;

    switch (section) {
      case "timestamp":
        const { now } = args;
        timestamp = parseInt(now.replace(/,/g, ""));
        break;
      default:
        break;
    }
  }
  return timestamp;
};

// get the block time of a block, given the prev block
export const getBlockTime = (block: any, prevBlock: any) => {
  const blockTimestamp = getTimestamp(block);
  const prevBlocktimestamp = getTimestamp(prevBlock);
  return (blockTimestamp - prevBlocktimestamp) / 1000;
};

// Takes a multiaddress and return the ip address and port
export const parseIP = (address: string) => {
  const ip = address.split("/")[2];
  const port = address.split("/")[4];
  return { ip: ip, port: port };
};

// Given an address, return the identity
export const getFormattedIdentity = async (api: ApiPromise, addr: string) => {
  let identity, verified, sub;
  identity = await api.query.identity.identityOf(addr);
  //@ts-ignore
  if (!identity.isSome) {
    identity = await api.query.identity.superOf(addr);
    //@ts-ignore
    if (!identity.isSome) return { name: addr, verified: false, sub: null };
    //@ts-ignore
    const subRaw = identity.toJSON()[1].raw;
    if (subRaw && subRaw.substring(0, 2) === "0x") {
      sub = hex2a(subRaw.substring(2));
    } else {
      sub = subRaw;
    }
    //@ts-ignore
    const superAddress = identity.toJSON()[0];
    identity = await api.query.identity.identityOf(superAddress);
  }

  //@ts-ignore
  const raw = identity.toJSON().info.display.raw;
  //@ts-ignore
  const { judgements } = identity.unwrap();
  for (const judgement of judgements) {
    const status = judgement[1];
    if (status.isReasonable || status.isKnownGood) {
      verified = status.isReasonable || status.isKnownGood;
      continue;
    }
  }

  if (raw && raw.substring(0, 2) === "0x") {
    return { name: hex2a(raw.substring(2)), verified: verified, sub: sub };
  } else return { name: raw, verified: verified, sub: sub };
};

export const percentage = (index: number, total: number) => {
  return `${((index / total) * 100).toFixed(2)}%`;
};

export const timeRemaining = (index: number, total: number, time: number) => {
  const remaining = total - index;
  const timeRemaining = ((remaining * time) / 1000).toFixed(2);
  return `(~${timeRemaining}s remaining)`;
};

export const formatDateFromUnix = (unixTimestamp: number): string => {
  const date = new Date(unixTimestamp); // Convert Unix timestamp to milliseconds
  return format(date, "dd-MM-yyyy"); // Format the date as 'DD-MM-YYYY'
};

export const isValidUrl = (str: string): boolean => {
  const pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name and extension
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i",
  ); // fragment locator
  return !!pattern.test(str);
};
