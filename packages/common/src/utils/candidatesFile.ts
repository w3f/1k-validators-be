import fs from "fs";

const writeCandidatesMatrix = (path: any, network: any) => {
  try {
    const conf = fs.readFileSync(path, { encoding: "utf-8" });
    const candidates = JSON.parse(conf).candidates;

    const filePath = `${network}-matrix.txt`;

    fs.writeFileSync(filePath, "", "utf8");

    const matrixHandles: (string | any[])[] = [];

    candidates.forEach((candidate: { riotHandle: string | any[] }) => {
      if (typeof candidate.riotHandle == "string") {
        if (!matrixHandles.includes(candidate.riotHandle)) {
          matrixHandles.push(candidate.riotHandle);
        }
      } else if (Array.isArray(candidate.riotHandle)) {
        candidate.riotHandle.forEach((handle) => {
          if (!matrixHandles.includes(handle)) {
            matrixHandles.push(handle);
          }
        });
      }
    });

    matrixHandles.forEach((handle) => {
      fs.appendFileSync(filePath, handle + "\n", "utf8");
    });
  } catch (e) {
    console.log("Invalid JSON!");
    process.exit(1);
  }
};

export const writeSlotIds = (path: any, network: any) => {
  try {
    const conf = fs.readFileSync(path, { encoding: "utf-8" });
    const json = JSON.parse(conf);
    const candidates = json.candidates;

    const filePath = `${network}-slots.json`;

    fs.writeFileSync(filePath, "", "utf8");

    let slotId = 0;
    const newCandidates = candidates.map((candidate) => {
      const newCandidate = {
        slotId: slotId,
        ...candidate,
        ...(candidate.kyc ? { kyc: candidate.kyc } : { kyc: false }),
        // slotId: slotId,
        // name: candidate.name,
        // stash: candidate.stash,
        // riotHandle: candidate.riotHandle,
        // skipSelfStake: candidate?.skipSelfStake
        //   ? candidate.skipSelfStake
        //   : false,
        // kusamaStash: candidate.kusamaStash ? candidate.kusamaStash : "",
        // kyc: candidate.kyc || false,
      };
      slotId++;
      return newCandidate;
    });

    json.candidates = newCandidates;

    fs.appendFileSync(filePath, JSON.stringify(json), "utf8");
  } catch (e) {
    console.log("Invalid JSON!");
    process.exit(1);
  }
};
