import * as bs58 from "bs58";
import * as hash from "hash.js";

export const sleep = (ms: number) =>
  new Promise((resolve: any) => {
    setTimeout(() => resolve(), ms);
  });

export const getNow = () => new Date().getTime();

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
