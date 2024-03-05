import { EraStatsModel } from "../../../src/db/models";
import { getLatestEraStats, setEraStats } from "../../../src/db/queries";
import { initTestServerBeforeAll } from "../../testUtils/dbUtils"; // Adjust the path as necessary

initTestServerBeforeAll();

describe("setEraStats", () => {
  it("should create new era stats if they don't exist", async () => {
    const era = 1;
    const totalNodes = 10;
    const valid = 8;
    const active = 6;
    const kyc = 3;
    await setEraStats(era, totalNodes, valid, active, kyc);

    const eraStats = await EraStatsModel.findOne({ era }).lean();
    expect(eraStats).toBeDefined();
    expect(eraStats?.totalNodes).toBe(totalNodes);
    expect(eraStats?.valid).toBe(valid);
    expect(eraStats?.active).toBe(active);
    expect(eraStats?.kyc).toBe(kyc);
  });

  it("should update existing era stats with different values", async () => {
    const era = 2;
    const initialTotalNodes = 5;
    const initialValid = 4;
    const initialActive = 3;
    const kyc = 2;
    await new EraStatsModel({
      era,
      totalNodes: initialTotalNodes,
      valid: initialValid,
      active: initialActive,
    }).save();

    const updatedTotalNodes = 12;
    const updatedValid = 10;
    const updatedActive = 8;
    await setEraStats(era, updatedTotalNodes, updatedValid, updatedActive, kyc);

    const eraStats = await EraStatsModel.findOne({ era }).lean();
    expect(eraStats).toBeDefined();
    expect(eraStats?.totalNodes).toBe(updatedTotalNodes);
    expect(eraStats?.valid).toBe(updatedValid);
    expect(eraStats?.active).toBe(updatedActive);
    expect(eraStats?.kyc).toBe(kyc);
  });

  it("should not update existing era stats if values are the same", async () => {
    const era = 3;
    const totalNodes = 20;
    const valid = 15;
    const active = 10;
    const kyc = 5;
    await new EraStatsModel({ era, totalNodes, valid, active, kyc }).save();

    // Call setEraStats with the same values
    await setEraStats(era, totalNodes, valid, active, kyc);

    const eraStats = await EraStatsModel.findOne({ era }).lean();
    expect(eraStats).toBeDefined();
    // Check that values remain the same
    expect(eraStats?.totalNodes).toBe(totalNodes);
    expect(eraStats?.valid).toBe(valid);
    expect(eraStats?.active).toBe(active);
    expect(eraStats?.kyc).toBe(kyc);
  });
});

describe("getLatestEraStats", () => {
  it("should return the latest era stats", async () => {
    const eras = [4, 5, 6];
    const eraStatsData = eras.map((era) => ({
      era,
      totalNodes: era * 2,
      valid: era * 1.5,
      active: era,
      kyc: 1,
    }));
    await EraStatsModel.create(eraStatsData);

    const latestEraStats = await getLatestEraStats();
    expect(latestEraStats).toHaveLength(1);
    expect(latestEraStats[0].era).toBe(eras[2]); // Latest era should be the highest era
  });
});
