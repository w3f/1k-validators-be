import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TelemetryClient } from "../../src";
import { queries } from "@1kv/common";
import path from "path";
import fs from "fs";

describe("Telemetry Integration Test", () => {
  let telemetry: TelemetryClient;
  const config = {
    db: {
      mongo: {
        uri: "mongodb://mongo:27017",
      },
    },
    server: {
      onlyHealth: true,
      port: 3302,
    },
    telemetry: {
      blacklistedProviders: [
        "Hetzner Online GmbH",
        "Contabo Inc.",
        "Contabo GmbH",
      ],
      enable: true,
      chains: [
        "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
      ],
      host: "wss://telemetry-backend.w3f.community/feed",
    },
  };

  const jsonPath = path.resolve(
    __dirname,
    "../../../../candidates/kusama.json",
  );
  const jsonData = fs.readFileSync(jsonPath, "utf-8");
  const candidates = JSON.parse(jsonData);

  beforeEach(async () => {
    telemetry = new TelemetryClient(config);
    await telemetry.start();

    // Wait until Telemetry is connected
    let isConnected = telemetry?.isConnected;
    while (!isConnected) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(true);
        }, 1000);
      });
      isConnected = telemetry?.isConnected;
    }

    // Add Candidates to DB
    for (const candidate of candidates.candidates) {
      if (candidate === null) {
        continue;
      } else {
        const { name, stash, riotHandle } = candidate;
        const kusamaStash = candidate.kusamaStash || "";
        const skipSelfStake = candidate.skipSelfStake || false;
        const id = candidate.slotId;
        const kyc = candidate.kyc || false;
        await queries.addCandidate(
          id,
          name,
          stash,
          kusamaStash,
          skipSelfStake,
          riotHandle,
          kyc,
        );
      }
    }
  });

  afterEach(async () => {
    if (telemetry) {
      await telemetry.disconnect();
    }
  });

  it("Should create telemetry nodes and unique candidate nodes", async () => {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });

    const telemetryNodes = await queries.allTelemetryNodes();
    const candidates = await queries.allCandidates();

    // Asserting that all candidates have a unique name and slotId
    const candidateNamesSet = new Set<string>();
    const candidateSlotIdsSet = new Set<string>();
    candidates.forEach((candidate) => {
      expect(candidateNamesSet.has(candidate.name)).toBeFalsy();
      candidateNamesSet.add(candidate.name);

      expect(candidateSlotIdsSet.has(candidate.slotId)).toBeFalsy();
      candidateSlotIdsSet.add(candidate.slotId);
    });

    expect(telemetryNodes.length).toBeGreaterThan(0);
    expect(candidates.length).toBeGreaterThan(0);
  }, 3000000);
});
