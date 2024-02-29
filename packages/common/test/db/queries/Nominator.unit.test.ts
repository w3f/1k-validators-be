import {
  addNominator,
  allNominators,
  clearCurrent,
  getCurrentTargets,
  getNominator,
  removeStaleNominators,
  setLastNomination,
  setTarget,
} from "../../../src/db/queries/";
import { initTestServerBeforeAll, omitFields } from "../../testUtils/dbUtils";
import { Nominator, NominatorModel } from "../../../src/db/models";
import {
  addKusamaCandidates,
  kusamaCandidates,
} from "../../testUtils/candidate";

initTestServerBeforeAll();

beforeEach(async () => {
  await addKusamaCandidates();
});

describe("Nominator Database Functions", () => {
  describe("removeStaleNominators", () => {
    it("should remove stale nominators from the database", async () => {
      await addNominator({
        address: "address1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 0,
        rewardDestination: "rewardDestination1",
      });
      await addNominator({
        address: "address2",
        stash: "stash2",
        proxy: "proxy2",
        bonded: 200,
        now: Date.now(),
        proxyDelay: 0,
        rewardDestination: "rewardDestination2",
      });

      await removeStaleNominators(["address1"]);

      const nominator = await getNominator("stash2");
      expect(nominator).toBeNull();

      const remainingNominator = await getNominator("stash1");
      expect(remainingNominator).not.toBeNull();
    });
  });

  describe("addNominator", () => {
    it("should add a new nominator to the database", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await addNominator(nominatorData);
      const savedNominator = await NominatorModel.findOne({
        address: nominatorData.address,
      });
      expect(savedNominator).toBeTruthy();
      expect(savedNominator?.stash).toBe(nominatorData.stash);
    });

    it("should update an existing nominator in the database", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await addNominator(nominatorData);

      nominatorData.stash = "updatedStash";

      await addNominator(nominatorData);

      const updatedNominator = await NominatorModel.findOne({
        address: nominatorData.address,
      });
      expect(updatedNominator?.stash).toBe(nominatorData.stash);
    });
  });

  describe("setTarget", () => {
    it("should set a new target for the specified nominator", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await addNominator(nominatorData);

      const candidate = kusamaCandidates[0];

      const address = "nominator1";
      const target = candidate.stash;
      const era = 123;
      const result = await setTarget(address, target, era);
      expect(result).toBe(true); // Assuming the function returns a boolean indicating success
      const nominator = await NominatorModel.findOne({ address });
      expect(nominator?.current?.length).toBe(1);
      expect(nominator?.current[0].stash).toBe(target);
    });
    it("returns false if candidate is not found", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await addNominator(nominatorData);

      const address = "nominator1";
      const target = "noncandidate";
      const era = 123;
      const result = await setTarget(address, target, era);
      expect(result).toBe(false); // Assuming the function returns a boolean indicating success
      const nominator = await NominatorModel.findOne({ address });
      expect(nominator?.current.length).toBe(0);
    });
  });

  describe("clearCurrent", () => {
    it("should clear the current targets of the specified nominator", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
        current: [
          { name: "target1", stash: "stash1", identity: {} },
          { name: "target2", stash: "stash2", identity: {} },
        ],
      };

      await addNominator(nominatorData);
      const candidate = kusamaCandidates[0];

      const address = "nominator1";
      const target = candidate.stash;
      const era = 123;
      await setTarget(address, target, era);

      await clearCurrent(nominatorData.address);

      const updatedNominator = await NominatorModel.findOne({
        address: nominatorData.address,
      }).lean();

      expect(updatedNominator?.current).toEqual([]);
    });
  });

  describe("setLastNomination", () => {
    it("should update the last nomination timestamp for the specified nominator", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };
      await addNominator(nominatorData);

      const now = Date.now();
      await setLastNomination(nominatorData.address, now);

      const updatedNominator = await NominatorModel.findOne({
        address: nominatorData.address,
      }).lean();

      expect(updatedNominator?.lastNomination).toBe(now);
    });
  });

  describe("getCurrentTargets", () => {
    it("should return the current targets of the specified nominator", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        now: Date.now(),
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await NominatorModel.create(nominatorData);

      const candidate1 = kusamaCandidates[0];
      const candidate2 = kusamaCandidates[1];

      const address = "nominator1";
      const era = 123;
      await setTarget(address, candidate1.stash, era);
      await setTarget(address, candidate2.stash, era);

      const expectedTargets = [
        {
          identity: null,
          name: "Blockshard",
          stash: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
        },
        {
          identity: null,
          name: "🎠 Forbole GP01 🇭🇰",
          stash: "D9rwRxuG8xm8TZf5tgkbPxhhTJK5frCJU9wvp59VRjcMkUf",
        },
      ];

      const currentTargets = await getCurrentTargets(nominatorData.address);

      expect(omitFields(currentTargets, ["__v", "_id"])).toEqual(
        expectedTargets,
      );
    });
  });

  describe("allNominators", () => {
    it("should return all nominators from the database", async () => {
      const nominatorsData: Nominator[] = [
        {
          address: "nominator1",
          avgStake: 0,
          bonded: 100,
          createdAt: 0,
          current: [],
          lastNomination: 0,
          nominateAmount: 0,
          proxy: "proxy1",
          proxyDelay: 5,
          rewardDestination: "reward1",
          stash: "stash1",
        },
        {
          address: "nominator2",
          avgStake: 0,
          bonded: 200,
          createdAt: 0,
          current: [],
          lastNomination: 0,
          nominateAmount: 0,
          proxy: "proxy2",
          proxyDelay: 10,
          rewardDestination: "reward2",
          stash: "stash2",
        },
      ];

      await NominatorModel.create(nominatorsData);

      const allNominatorsData = await allNominators();

      expect(omitFields(allNominatorsData, ["__v", "_id"])).toEqual(
        expect.arrayContaining(nominatorsData),
      );
    });
  });

  describe("getNominator", () => {
    it("should return the nominator with the specified stash from the database", async () => {
      const nominatorData: Nominator = {
        address: "nominator1",
        stash: "stash1",
        proxy: "proxy1",
        bonded: 100,
        proxyDelay: 5,
        rewardDestination: "reward1",
      };

      await NominatorModel.create(nominatorData);
      const nominatorStash = nominatorData.stash || "";

      const fetchedNominator = await getNominator(nominatorStash);
      if (fetchedNominator) {
        expect(
          omitFields(fetchedNominator, [
            "__v",
            "_id",
            "avgStake",
            "createdAt",
            "current",
            "lastNomination",
            "nominateAmount",
          ]),
        ).toEqual(nominatorData);
      }
    });
  });
});
