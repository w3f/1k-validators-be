// import { setValidatorRanks } from "../../src/utils";
import { addKusamaCandidates } from "../testUtils/candidate";
import { Identity } from "../../src/types";
import {
  addCandidate,
  getCandidate,
  getIdentityValidatorActiveEras,
  getValidatorActiveEras,
  setCandidateIdentity,
  setValidatorSet,
} from "../../src/db/queries";
import { initTestServerBeforeAll } from "../testUtils/dbUtils";
import { ValidatorSetModel } from "../../src/db";
import { setValidatorRanks } from "../../src/utils/Validators";

initTestServerBeforeAll();
describe("setValidatorRanks", () => {
  it("should set ranks for all candidates", async () => {
    await addKusamaCandidates();

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

    await setValidatorSet(1, 1, [identity1?.address, identity2?.address]);
    await setValidatorSet(5, 2, [identity1?.address, identity2?.address]);
    await setValidatorSet(8, 3, [
      identity1?.address,
      identity3?.address,
      identity5?.address,
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
    ]);
    await setValidatorSet(16, 4, [
      identity1?.address,
      identity3?.address,
      identity4?.address,
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
      identity5?.address,
    ]);
    await setValidatorSet(100, 5, [identity1?.address, identity4?.address]);

    const validatorSets = await ValidatorSetModel.find({}).exec();
    expect(validatorSets.length).toBe(5);

    const numEras = await getValidatorActiveEras(identity1?.address);
    expect(numEras).toBe(5);

    const subNumEras = await getIdentityValidatorActiveEras(
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
    );
    expect(subNumEras).toBe(5);

    await setValidatorRanks();
    const candidate = await getCandidate(identity1?.address);
    expect(candidate?.rank).toBe(5);

    const secondNode = await getCandidate(
      "HkJjBkX8fPBFJvTtAbUDKWZSsMrNFuMc7TrT8BqVS5YhZXg",
    );
    expect(secondNode?.rank).toBe(5);
  }, 10000);
});
