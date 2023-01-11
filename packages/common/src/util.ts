import Keyring from "@polkadot/keyring";
import * as bs58 from "bs58";
import * as hash from "hash.js";
import { ConfigSchema } from "./config";
import fetch from "node-fetch";
import logger from "./logger";
import { LOCATION_URL } from "./constants";
import { ApiPromise } from "@polkadot/api";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });

export const getNow = (): number => new Date().getTime();

export const getRawPeerId = (peerId: string): string => {
  // There's two versions of the peer id:
  // - The new versions start with "12"
  // - The old versions start with "Qm"

  // The first step of either version is to base58 decode it.
  const buf = bs58.decode(peerId);

  // Get the first two byte prefix.
  //@ts-ignore
  const prefix = buf.slice(0, 2).toString("hex");

  // The new prefix.
  if (prefix == "0024") {
    return hash.sha256().update(buf.slice(2)).digest("hex");
  }

  // The old prefix.
  if (prefix == "1220") {
    //@ts-ignore
    return buf.slice(2).toString("hex");
  }

  return "";
};

/*
 * Turn the map<String, Object> to an Object so it can be converted to JSON
 */
export function mapToObj(inputMap: Map<string, number>): any {
  const obj = {};

  inputMap.forEach(function (value, key) {
    obj[key] = value;
  });

  return obj;
}

// Converts raw decimal to human readible format
//     - Test Net: 10 Decimals
//     - Polkadot: 10 Decimals
//     - Kusama: 12 Decimals
export const toDecimals = (raw: number, networkDecimals): number => {
  return raw / Math.pow(10, networkDecimals);
};

export const formatAddress = (
  address: string,
  config: ConfigSchema
): string => {
  const keyring = new Keyring();
  const ss58Prefix = config.global.networkPrefix == 2 ? 2 : 0;
  return keyring.encodeAddress(address, ss58Prefix);
};

export const hex2a = (hex) => {
  return decodeURIComponent("%" + hex.match(/.{1,2}/g).join("%"));
};

export const subscanUrl = (config: ConfigSchema) => {
  return config.global.networkPrefix == 2
    ? "kusama.subscan.io"
    : "polkadot.subscan.io";
};

export const addressUrl = (address: string, config: ConfigSchema) => {
  return `<a href="https://${subscanUrl(
    config
  )}/account/${address}">${address}</a>`;
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
        { label: "Location" }
      );
    }
    if (!addr) {
      logger.warn("No address to query location info for");
    }
    return blank;
  }
  let json;
  try {
    const resp = await fetch(`${LOCATION_URL}${addr}?${iit}`);
    json = await resp.json();
  } catch (e) {
    logger.info(`There was an error fetching location data....`);
    logger.info(e);
    return blank;
  }
  if (json.bogon) {
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
  paraValIndices: number[]
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
  paraValIndices: number[]
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

export const percentage = (index, total) => {
  return `${((index / total) * 100).toFixed(2)}%`;
};

export const timeRemaining = (index, total, time) => {
  const remaining = total - index;
  const timeRemaining = ((remaining * time) / 1000).toFixed(2);
  return `(~${timeRemaining}s remaining)`;
};
