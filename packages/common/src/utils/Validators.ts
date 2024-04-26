import { allCandidates, getAllValidatorSets, setRank } from "../db/queries";
import { queries } from "../index";

// Sets all validators ranks
export const setValidatorRanks = async () => {
  const candidates = await allCandidates();
  const validatorSets = await getAllValidatorSets();
  for (const candidate of candidates) {
    const identityRank = await queries.getIdentityValidatorActiveEras(
      candidate.stash,
      validatorSets,
    );
    await setRank(candidate.stash, identityRank);
  }
};
