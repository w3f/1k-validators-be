import Keyring from "@polkadot/keyring";
import * as bs58 from "bs58";
import * as hash from "hash.js";
import { Config } from "./config";

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
  const prefix = buf.slice(0, 2).toString("hex");

  // The new prefix.
  if (prefix == "0024") {
    return hash.sha256().update(buf.slice(2)).digest("hex");
  }

  // The old prefix.
  if (prefix == "1220") {
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

export const formatAddress = (address: string, config: Config): string => {
  const keyring = new Keyring();
  const ss58Prefix = config.global.networkPrefix == 2 ? 2 : 0;
  return keyring.encodeAddress(address, ss58Prefix);
};

export const hex2a = (hex) => {
  return decodeURIComponent("%" + hex.match(/.{1,2}/g).join("%"));
};

export const subscanUrl = (config: Config) => {
  return config.global.networkPrefix == 2
    ? "kusama.subscan.io"
    : "polkadot.subscan.io";
};

export const addressUrl = (address: string, config: Config) => {
  return `<a href="https://${subscanUrl(
    config
  )}/account/${address}">${address}</a>`;
};
