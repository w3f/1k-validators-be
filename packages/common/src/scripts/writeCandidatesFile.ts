import fs from "fs";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex } from "@polkadot/util";
import { User } from "matrix-js-sdk";
import { writeSlotIds } from "../utils/candidatesFile";
import { logger } from "../index";

// Check if a given address is a valid polkadot address
const isValidAddressPolkadotAddress = (address: string) => {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

    return true;
  } catch (error) {
    return false;
  }
};

// Checks if there are duplicate stash addresses in the candidates config file
const checkDuplicateAddresses = (candidates: any) => {
  const idSet = new Set();
  const hasDuplicate = candidates.some((validator: any) => {
    if (idSet.size === idSet.add(validator.stash).size) {
      console.log("Duplicate address: " + validator.stash);
      return true;
    }
  });
  if (hasDuplicate) {
    console.log("Duplicate address!");
    process.exit(1);
  }
};

// Checks if there are multiple nodes with the same telemetry name in the config file
const checkDuplicateNodeNames = (candidates: any) => {
  const idSet = new Set();
  const hasDuplicate = candidates.some((validator: any) => {
    if (idSet.size === idSet.add(validator.name).size) {
      console.log("Duplicate node name: " + validator.name);
      return true;
    }
  });
  if (hasDuplicate) {
    console.log("Duplicate node name!");
    process.exit(1);
  }
};

// Checks if the matrix handles for a candidate are a valid format
const checkMatrixHandle = (candidates: any) => {
  const matrixHandleRegex =
    /^@[A-Za-z0-9_./\-]+:[A-Za-z0-9_.\-]+\.[A-Za-z]{2,}$/;

  try {
    for (const candidate of candidates) {
      const user = new User(candidate.riotHandle);

      if (typeof candidate.riotHandle == "string") {
        if (!matrixHandleRegex.test(candidate.riotHandle)) {
          console.log("Invalid matrix handle: " + candidate.riotHandle);
          process.exit(1);
        }
      } else if (Array.isArray(candidate.riotHandle)) {
        for (const handle of candidate.riotHandle) {
          if (!matrixHandleRegex.test(handle)) {
            console.log("Invalid matrix handle: " + handle);
            process.exit(1);
          }
        }
      }
    }
  } catch (error) {
    console.log("Invalid matrix handle!");
    process.exit(1);
  }
};

// Checks if the addresses in the config file are valid polkadot addresses
const checkValidAddresses = (candidates: any) => {
  for (const candidate of candidates) {
    if (!isValidAddressPolkadotAddress(candidate.stash)) {
      console.log("Invalid address: " + candidate.stash);
      process.exit(1);
    }
  }
};

const checkConfigFile = (path: any) => {
  try {
    const conf = fs.readFileSync(path, { encoding: "utf-8" });
    const candidates = JSON.parse(conf).candidates;

    checkDuplicateNodeNames(candidates);
    checkValidAddresses(candidates);
    checkDuplicateAddresses(candidates);
    checkMatrixHandle(candidates);
  } catch (e) {
    console.log("Invalid JSON!");
    process.exit(1);
  }
};

if (require.main === module) {
  // Check Polkadot and Kusama Config Files
  (async () => {
    const kusamaConfig = "../../candidates/kusama.json";
    const polkadotConfig = "../../candidates/polkadot.json";

    checkConfigFile(kusamaConfig);
    checkConfigFile(polkadotConfig);

    logger.info("✅ Config files are valid!");
    writeSlotIds(kusamaConfig, "kusama");
    writeSlotIds(polkadotConfig, "polkadot");
    logger.info("✅ New Candidates Config written to file!");

    process.exit(0);
  })();
}
export {};
