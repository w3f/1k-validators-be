import { logger } from "@1kv/common";
import fs from "fs";

const writeMatrixHandlesToFile = (path: string, network: string) => {
  try {
    const conf = fs.readFileSync(path, { encoding: "utf-8" });
    const candidates = JSON.parse(conf).candidates;

    const filePath = `${network}-matrix.txt`;

    fs.writeFileSync(filePath, "", "utf8");

    const matrixHandles: string[] = [];

    candidates.forEach((candidate: { riotHandle: string | string[] }) => {
      const handles = Array.isArray(candidate.riotHandle)
        ? candidate.riotHandle
        : [candidate.riotHandle];

      handles.forEach((handle) => {
        if (!matrixHandles.includes(handle)) {
          matrixHandles.push(handle);
          fs.appendFileSync(filePath, `${handle}\n`, "utf8");
        }
      });
    });

    logger.info(`✅ Wrote handles to ${filePath}`);
  } catch (e) {
    logger.error("Error writing matrix handles to file:", e);
    process.exit(1);
  }
};

if (require.main === module && process.env.RUN_SCRIPTS === "true") {
  (async () => {
    const kusamaConfigPath = "../../candidates/kusama.json";
    const polkadotConfigPath = "../../candidates/polkadot.json";

    writeMatrixHandlesToFile(kusamaConfigPath, "kusama");
    writeMatrixHandlesToFile(polkadotConfigPath, "polkadot");
  })();
}

export {};
