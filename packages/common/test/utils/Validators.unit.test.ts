// import { setValidatorRanks } from "../../src/utils";
import { addKusamaCandidates } from "../testUtils/candidate";
import { Identity } from "../../src/types";
import {
  addCandidate,
  getAllValidatorSets,
  getCandidateByStash,
  getIdentityValidatorActiveEras,
  getValidatorActiveEras,
  setCandidateIdentity,
  setValidatorSet,
} from "../../src/db/queries";
import { setValidatorRanks } from "../../src/utils/Validators";
import { describe, expect, it } from "vitest";
import { sleep } from "../../src/utils";

describe("setValidatorRanks", () => {
  it("should set ranks for all candidates", async () => {
    const setCandidates = await addKusamaCandidates();
    expect(setCandidates).toBe(true);
    await addCandidate(
      2398,
      "Blockshard2",
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
      "",
      false,
      "matrixhandle",
      false,
    );

    const identity1: Identity = {
      address: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
      name: "Blockshard",
      display: "Blockshard",
      subIdentities: [
        {
          name: "Blockshard2",
          address: "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
        },
      ],
    };
    const identity2: Identity = {
      address: "D9rwRxuG8xm8TZf5tgkbPxhhTJK5frCJU9wvp59VRjcMkUf",
      name: "🎠 Forbole GP01 🇭🇰",
      display: "🎠 Forbole GP01 🇭🇰",
    };
    const identity3: Identity = {
      address: "J4hAvZoHCviZSoPHoSwLida8cEkZR1NXJcGrcfx9saHTk7D",
      name: "Anonstake",
      display: "Anonstake",
    };
    const identity4: Identity = {
      address: "EPhtbjecJ9P2SQEGEJ4XmFS4xN7JioBFarSrbqjhj8BuJ2v",
      name: "Indigo One",
      display: "Indigo One",
    };
    const identity5: Identity = {
      address: "HhcrzHdB5iBx823XNfBUukjj4TUGzS9oXS8brwLm4ovMuVp",
      name: "KIRA Staking",
      display: "KIRA Staking",
    };
    await setCandidateIdentity(identity1?.address, identity1);
    await setCandidateIdentity(identity2?.address, identity2);
    await setCandidateIdentity(identity3?.address, identity3);
    await setCandidateIdentity(identity4?.address, identity4);
    await setCandidateIdentity(identity5?.address, identity5);

    await sleep(2000);

    const identities = [identity1, identity2, identity3, identity4, identity5];
    for (const identity of identities) {
      const candidateExists = await getCandidateByStash(identity?.address);
      expect(candidateExists).not.toBe(null);
    }

    const didSet1 = await setValidatorSet(1, 1, [
      identity1?.address,
      identity2?.address,
    ]);
    expect(didSet1).toBe(true);
    const didSet2 = await setValidatorSet(5, 2, [
      identity1?.address,
      identity2?.address,
    ]);
    expect(didSet2).toBe(true);
    const didSet3 = await setValidatorSet(8, 3, [
      identity1?.address,
      identity3?.address,
      identity5?.address,
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
    ]);
    expect(didSet3).toBe(true);
    const didSet4 = await setValidatorSet(16, 4, [
      identity1?.address,
      identity3?.address,
      identity4?.address,
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
      identity5?.address,
    ]);
    expect(didSet4).toBe(true);
    const didSet5 = await setValidatorSet(100, 5, [
      identity1?.address,
      identity4?.address,
    ]);
    expect(didSet5).toBe(true);

    await sleep(2000);

    const validatorSets = await getAllValidatorSets();

    await sleep(2000);
    console.log(JSON.stringify(validatorSets, null, 2));

    expect(validatorSets.length).toBe(5);

    const numEras = await getValidatorActiveEras(identity1?.address);
    expect(numEras).toBe(5);

    await sleep(2000);

    const subNumEras = await getIdentityValidatorActiveEras(
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
      validatorSets,
    );
    expect(subNumEras).toBe(5);

    await sleep(2000);

    await setValidatorRanks();
    const candidate = await getCandidateByStash(identity1?.address);
    expect(candidate?.rank).toBe(5);

    const secondNode = await getCandidateByStash(
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
    );
    expect(secondNode?.rank).toBe(5);
  }, 30000);
});
