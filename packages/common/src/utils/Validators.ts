import { allCandidates, setRank } from "../db";
import { queries } from "../index";

// Sets all validators ranks
export const setValidatorRanks = async () => {
  const candidates = await allCandidates();
  for (const candidate of candidates) {
    const identityRank = await queries.getIdentityValidatorActiveEras(
      candidate.stash,
    );
    await setRank(candidate.stash, identityRank);
  }
};
