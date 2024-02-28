import fs from "fs";
import { decodeAddress, encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex } from "@polkadot/util";
import { User } from "matrix-js-sdk";

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

const checkSlotId = (candidates: any[]) => {
  const slots = new Set<number>();

  const hasDuplicateSlotIds = candidates.some((candidate) => {
    // Check if slotId is present
    if (candidate.slotId === undefined || candidate.slotId === null) {
      console.error(`Candidate ${candidate.stash} is missing a slotId.`);
      return true;
    }

    // Check if slotId is a number
    if (typeof candidate.slotId !== "number") {
      console.error(`slotId for candidate ${candidate.stash} is not a number.`);
      return true;
    }

    // Check if slotId is an integer
    if (!Number.isInteger(candidate.slotId)) {
      console.error(
        `slotId for candidate ${candidate.stash} is not an integer.`,
      );
      return true;
    }

    // Check for uniqueness of slotId
    if (slots.has(candidate.slotId)) {
      console.error(
        `Duplicate slotId found: ${candidate.slotId} for candidate ${candidate.stash}.`,
      );
      return true;
    }
    slots.add(candidate.slotId);

    return false;
  });

  if (hasDuplicateSlotIds) {
    process.exit(1);
  }
};

const checkKYC = (candidates: any) => {
  for (const candidate of candidates) {
    // Check if the kyc property exists
    if (candidate.kyc === undefined) {
      console.error(
        `KYC information missing for candidate with stash ${candidate.stash}.`,
      );
      process.exit(1);
    }

    // Check if the kyc property is a boolean
    if (typeof candidate.kyc !== "boolean") {
      console.error(
        `KYC information for candidate with stash ${candidate.stash} is not a boolean value.`,
      );
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
    checkSlotId(candidates);
    checkKYC(candidates);
  } catch (e) {
    console.log("Invalid JSON!");
    process.exit(1);
  }
};

// Check Polkadot and Kusama Config Files
const kusamaConfig = "../../candidates/kusama.json";
const polkadotConfig = "../../candidates/polkadot.json";

checkConfigFile(kusamaConfig);
checkConfigFile(polkadotConfig);

console.log("✅ Config files are valid!");
