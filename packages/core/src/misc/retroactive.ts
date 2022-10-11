import ApiHandler from "../ApiHandler";
import ChainData from "../chaindata";
import Db from "../db";
import { CandidateData } from "../types";

/**
 * Retroactively increases validators ranks based on their activity between
 * era 1728 to era 1760, roughly between 4 Jan and Jan 12.
 */
export const retroactiveRanks = async (
  candidates: CandidateData[],
  handler: ApiHandler,
  db?: Db
): Promise<boolean> => {
  const chaindata = new ChainData(handler);

  const chainType = await db.getChainMetadata();

  const startEra = 1940;
  const endEra = 1988;
  const step = 4; // every 4 eras (kusama)

  const result = new Map();

  let currentEra = startEra;
  while (currentEra !== endEra) {
    console.log("working for ", currentEra, currentEra + 4);
    const [activeValidators, err] = await chaindata.activeValidatorsInPeriod(
      currentEra,
      currentEra + 4,
      chainType.name
    );

    if (err) {
      // end early
      throw new Error(err);
    }

    for (const candidate of candidates) {
      const { stash } = candidate;

      const wasActive = activeValidators.indexOf(stash) !== -1;

      if (wasActive) {
        if (result.has(candidate)) {
          const oldValue = result.get(candidate);
          result.set(candidate, oldValue + 1);
        } else {
          result.set(candidate, 1);
        }
      }
    }
    candidates;

    currentEra = currentEra + step;
  }

  for (const [c, v] of result) {
    console.log(`${c.name} +${v}`);
    for (let i = 0; i < v; i++) {
      console.log("adding point", c.name, i);
      if (db) {
        await db.addPoint(c.stash);
      }
    }
  }

  return true;
};

// const main = async () => {
//   const handler = await ApiHandler.create(KusamaEndpoints);
//   retroactiveRanks(kusama.scorekeeper.candidates as any, handler);
// };

// try {
//   main();
// } catch (err) {
//   console.error(err);
// }
