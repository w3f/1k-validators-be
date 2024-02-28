import { BlockIndexModel } from "../../../src/db/models";
import { getBlockIndex, setBlockIndex } from "../../../src/db/queries/Block";
import { initTestServerBeforeAll } from "../../testUtils/dbUtils";

initTestServerBeforeAll();

beforeEach(async () => {
  await BlockIndexModel.deleteMany({});
});

describe("Block Index Database Functions", () => {
  describe("getBlockIndex", () => {
    it("should return null if no block index exists", async () => {
      const result = await getBlockIndex();
      expect(result).toBeNull();
    });

    it("should return the block index if it exists", async () => {
      // Assuming you have a BlockIndexModel with some data
      await new BlockIndexModel({ earliest: 0, latest: 100 }).save();

      const result = await getBlockIndex();
      expect(result).toBeDefined();
      expect(result?.earliest).toBe(0);
      expect(result?.latest).toBe(100);
    });
  });

  describe("setBlockIndex", () => {
    it("should create a new block index if none exists", async () => {
      await setBlockIndex(0, 100);

      const result = await BlockIndexModel.findOne({});
      expect(result).toBeDefined();
      expect(result?.earliest).toBe(0);
      expect(result?.latest).toBe(100);
    });

    it("should update the earliest block index if new earliest is smaller", async () => {
      await new BlockIndexModel({ earliest: 10, latest: 100 }).save();
      const index = await getBlockIndex();
      expect(index).toBeDefined();

      await setBlockIndex(5, 100);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const blocks = await BlockIndexModel.find({});
      const result = await BlockIndexModel.findOne({});

      expect(result).toBeDefined();
      expect(result?.earliest).toBe(5);
      expect(result?.latest).toBe(100);
    });

    it("should update the latest block index if new latest is larger", async () => {
      await new BlockIndexModel({ earliest: 0, latest: 100 }).save();
      await setBlockIndex(0, 150);

      const result = await BlockIndexModel.findOne({});

      expect(result).toBeDefined();
      expect(result?.earliest).toBe(0);
      expect(result?.latest).toBe(150);
    });

    it("should not update anything if the existing block index covers the range", async () => {
      await new BlockIndexModel({ earliest: 0, latest: 100 }).save();
      await setBlockIndex(10, 90);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const result = await BlockIndexModel.findOne({});
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(result).toBeDefined();
      expect(result?.earliest).toBe(0);
      expect(result?.latest).toBe(100);
    });
  });
});
