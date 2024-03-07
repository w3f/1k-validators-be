import {
  IITModel,
  IITRequestCounterModel,
  LocationModel,
} from "../../../src/db/models";
import {
  cleanBlankLocations,
  getAllLocations,
  getCandidateLocation,
  getIIT,
  getLocation,
  getLocations,
  iitExists,
  removeIIT,
  setIIT,
  setLocation,
  updateIITRequestCount,
} from "../../../src/db/queries";
import {
  initTestServerBeforeAll,
  omitFields,
  omitId,
  omitUpdated,
  sortByKey,
} from "../../testUtils/dbUtils";
import {
  addKusamaCandidates,
  kusamaCandidates,
} from "../../testUtils/candidate";
import { addKusamaLocations, kusamaLocations } from "../../testUtils/location";
import { deleteAllDb, deleteLocations } from "../../testUtils/deleteAll";

initTestServerBeforeAll();

describe("Location queries", () => {
  beforeEach(async () => {
    await deleteAllDb();
    await addKusamaCandidates();
    await addKusamaLocations();
  });

  describe("getAllLocations", () => {
    it("should return all locations when locations are found", async () => {
      const candidate = kusamaCandidates[0];
      const testData = sortByKey(
        kusamaLocations.map(omitId).map(omitUpdated),
        "session",
      );

      const locations = await getAllLocations();

      const result = sortByKey(
        locations.map(omitId).map(omitUpdated),
        "session",
      );

      expect(result).toEqual(testData);
    });

    it("should return empty array when no locations are found", async () => {
      await LocationModel.deleteMany({});
      const result = await getAllLocations();
      expect(result).toEqual([]);
    });
  });

  describe("getLocations", () => {
    it("should return all locations for a candidate when locations are found", async () => {
      const candidate = kusamaCandidates[0];
      const testData = sortByKey(
        kusamaLocations
          .filter((location) => {
            return location.name === candidate.name;
          })
          .map(omitId)
          .map(omitUpdated),
        "session",
      );

      const locations = await getLocations(candidate.stash);

      const result = sortByKey(
        locations.map(omitId).map(omitUpdated),
        "session",
      );

      expect(result).toEqual(testData);
    });

    it("should return empty array when no locations are found", async () => {
      const result = await getLocations("nonExistentAddress");
      expect(result).toEqual([]);
    });
  });

  describe("getLocation", () => {
    it("should return the location if found", async () => {
      const existingLocationData = {
        name: "ExistingLocation",
        address: "existingAddr",
        addr: "existingAddr",
        port: 8080,
        city: "ExistingCity",
        region: "ExistingRegion",
        country: "ExistingCountry",
        provider: "ExistingProvider",
        updated: Date.now(),
        session: 123,
        source: "ExistingSource",
        vpn: false,
        cpu: "ExistingCPU",
        memory: "ExistingMemory",
        coreCount: "8",
        vm: true,
      };
      const existingLocation = new LocationModel(existingLocationData);
      await existingLocation.save();

      const result = await getLocation("ExistingLocation", "existingAddr");

      expect(result).toBeTruthy();
      expect(result?.name).toBe(existingLocationData.name);
      expect(result?.address).toBe(existingLocationData.address);
      expect(result?.addr).toBe(existingLocationData.addr);
      expect(result?.port).toBe(existingLocationData.port);
      expect(result?.city).toBe(existingLocationData.city);
      expect(result?.region).toBe(existingLocationData.region);
      expect(result?.country).toBe(existingLocationData.country);
      expect(result?.provider).toBe(existingLocationData.provider);
      expect(result?.updated).toBe(existingLocationData.updated);
      expect(result?.session).toBe(existingLocationData.session);
      expect(result?.source).toBe(existingLocationData.source);
      expect(result?.vpn).toBe(existingLocationData.vpn);
      expect(result?.cpu).toBe(existingLocationData.cpu);
      expect(result?.memory).toBe(existingLocationData.memory);
      expect(result?.coreCount).toBe(existingLocationData.coreCount);
      expect(result?.vm).toBe(existingLocationData.vm);
    });

    it("should return null if location not found", async () => {
      const result = await getLocation(
        "NonExistentLocation",
        "nonExistentAddr",
      );

      expect(result).toBeNull();
    });
  });

  describe("getCandidateLocation", () => {
    it("should return the location if found", async () => {
      const candidate = kusamaCandidates[0];
      const testData = sortByKey(
        kusamaLocations
          .filter((location) => {
            return location.name === candidate.name;
          })
          .map((location) =>
            omitFields(omitUpdated(omitId(location)), ["session"]),
          ),
        "session",
      )[0];

      const location = await getCandidateLocation(
        candidate.slotId,
        candidate.stash,
        candidate.name,
      );
      let result;
      if (location) {
        result = omitFields(location, ["_id", "__v", "updated", "session"]);
      }

      expect(result).toEqual(testData);
    });
  });

  describe("setLocation", () => {
    it("should create a new location if no matching location found", async () => {
      await deleteLocations();
      const result = await setLocation(
        0,
        "stash",
        "NewLocation",
        "newAddr",
        "NewCity",
        "NewRegion",
        "NewCountry",
        "NewProvider",
        {
          linux_distro: "",
          linux_kernel: "",
          cpu: "NewCPU",
          memory: "NewMemory",
          core_count: 4,
          is_virtual_machine: false,
        },
        true,
        8080,
      );

      expect(result).toBeTruthy();
      const location = await LocationModel.findOne({ name: "NewLocation" });
      expect(location).toBeTruthy();
    });
  });

  describe("cleanBlankLocations", () => {
    it("should delete locations with city 'None' or empty addr", async () => {
      const location1 = new LocationModel({
        name: "Location1",
        city: "None",
        addr: "address1",
      });
      const location2 = new LocationModel({
        name: "Location2",
        city: "City2",
        addr: "",
      });
      const location3 = new LocationModel({
        name: "Location3",
        city: "City3",
        addr: "address3",
      });

      await Promise.all([location1.save(), location2.save(), location3.save()]);

      await cleanBlankLocations();

      const deletedLocations = await LocationModel.find({
        $or: [{ city: "None" }, { addr: "" }],
      });

      expect(deletedLocations.length).toBe(0);
    });
  });

  describe("iitExists", () => {
    it("should return true if an IIT exists", async () => {
      const token = new IITModel({ iit: "testAccessToken" });
      await token.save();

      const exists = await iitExists();

      expect(exists).toBeTruthy();
    });

    it("should return false if no IIT exists", async () => {
      const exists = await iitExists();

      expect(exists).toBeFalsy();
    });
  });

  describe("getIIT", () => {
    it("should return the IIT document", async () => {
      const token = new IITModel({ iit: "testAccessToken" });
      await token.save();

      const result = await getIIT();

      expect(omitId(result)).toEqual({ iit: "testAccessToken" });
    });
  });

  describe("setIIT", () => {
    it("should create a new IIT document if it does not exist", async () => {
      await setIIT("newAccessToken");

      const token = await IITModel.findOne({ iit: "newAccessToken" });

      expect(token).toBeTruthy();
    });

    it("should update the existing IIT document if it exists", async () => {
      const existingToken = new IITModel({ iit: "existingAccessToken" });
      await existingToken.save();

      await setIIT("updatedAccessToken");

      const updatedToken = await IITModel.findOne({
        iit: "updatedAccessToken",
      });

      expect(updatedToken).toBeTruthy();
    });
  });

  describe("removeIIT", () => {
    it("should remove the IIT document", async () => {
      const token = new IITModel({ iit: "testAccessToken" });
      await token.save();

      await removeIIT();

      const result = await IITModel.findOne({ iit: "testAccessToken" });

      expect(result).toBeFalsy();
    });
  });

  describe("updateIITRequestCount", () => {
    it("should increment the request count and update timestamps", async () => {
      await updateIITRequestCount();

      const counter = await IITRequestCounterModel.findOne({});

      expect(counter?.requestCount).toBe(1);
      expect(counter?.firstRequest).toBeTruthy();
      expect(counter?.lastRequest).toBeTruthy();
    });
  });
});
