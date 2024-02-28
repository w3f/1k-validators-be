import { getNomination, setNomination } from "./../../../src/db/queries";
import { initTestServerBeforeAll } from "../../testUtils/dbUtils"; // Assuming the file name is nominations.ts

initTestServerBeforeAll();

describe("Nominations Database Functions", () => {
  describe("setNomination", () => {
    it("should set a new nomination if no existing nomination found", async () => {
      const address = "sampleAddress";
      const era = 1;
      const targets = ["validator1", "validator2"];
      const bonded = 100;
      const blockHash = "sampleBlockHash";

      await setNomination(address, era, targets, bonded, blockHash);

      const nomination = await getNomination(address, era);
      expect(nomination).toBeDefined();
      expect(nomination?.address).toEqual(address);
      expect(nomination?.era).toEqual(era);
      expect(nomination?.validators).toEqual(targets);
      expect(nomination?.bonded).toEqual(bonded);
      expect(nomination?.blockHash).toEqual(blockHash);
    });

    it("should not set a new nomination if existing nomination found", async () => {
      const address = "sampleAddress";
      const era = 1;
      const targets = ["validator1", "validator2"];
      const bonded = 100;
      const blockHash = "sampleBlockHash";

      await setNomination(address, era, targets, bonded, blockHash);

      const newBlockHash = "newSampleBlockHash";
      await setNomination(address, era, targets, bonded, newBlockHash);

      const nomination = await getNomination(address, era);
      expect(nomination?.blockHash).toEqual(blockHash); // Ensure blockHash remains unchanged
    });
  });
});
