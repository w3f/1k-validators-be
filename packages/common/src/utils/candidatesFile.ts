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
