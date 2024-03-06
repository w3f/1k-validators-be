import { allCandidates, setRank } from "../db/queries";
import { queries } from "../index";
import { setAllIdentities } from "./Identity";
import Chaindata from "../chaindata/chaindata";

// Sets all validators ranks
export const setValidatorRanks = async (chaindata?: Chaindata) => {
  await setAllIdentities(chaindata);
  const candidates = await allCandidates();
  for (const candidate of candidates) {
    const identityRank = await queries.getIdentityValidatorActiveEras(
      candidate.stash,
    );
    await setRank(candidate.stash, identityRank);
  }
};
