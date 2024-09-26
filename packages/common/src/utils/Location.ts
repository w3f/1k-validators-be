import {
  Candidate,
  getCandidateByName,
  getCandidateLocation,
  getIIT,
  removeIIT,
  setIIT,
  setLocation,
  updateIITRequestCount,
} from "../db";
import { fetchLocationInfo } from "./util";
import {
  BenchmarkSpec,
  HardwareSpec,
  TelemetryNodeDetails,
  TelemetryWsPayload,
} from "../types";
import logger from "../logger";
import { STALE_TELEMETRY_THRESHOLD } from "../constants";

const getBenchmarks = (scores: BenchmarkSpec) => {
  const defaultScores = {
    cpu_hashrate_score: 0,
    memory_memcpy_score: 0,
    disk_sequential_write_score: 0,
    disk_random_write_score: 0,
  };

  return scores === null ? defaultScores : scores;
};

const getHardwareSpec = (hardware: HardwareSpec) => {
  const defaultHardware = {
    cpu: "",
    memory: "",
    core_count: 0,
    linux_kernel: "",
    linux_distro: "",
    is_virtual_machine: false,
  };

  return hardware === null ? defaultHardware : hardware;
};

export const nodeDetailsFromTelemetryMessage = (
  payload: TelemetryWsPayload,
): TelemetryNodeDetails | null => {
  try {
    const [
      id,
      [
        name,
        nodeImplementation,
        version,
        address,
        networkId,
        addr,
        hardware,
        benchmarkScores,
      ],
      nodeStats,
      nodeIO,
      nodeHardware,
      blockDetails,
      location,
      startupTime,
    ] = payload;

    const benchmarkScore = getBenchmarks(benchmarkScores);
    const hardwareSpec = getHardwareSpec(hardware);

    return {
      telemetryId: id,
      name: name,
      nodeImplementation: nodeImplementation,
      version: version,
      ipAddress: addr,
      startupTime: startupTime,
      hardwareSpec: {
        cpu: hardwareSpec?.cpu || "",
        memory: hardwareSpec?.memory || "",
        core_count: hardwareSpec?.core_count || 0,
        linux_kernel: hardwareSpec?.linux_kernel || "",
        linux_distro: hardwareSpec?.linux_distro || "",
        is_virtual_machine: hardwareSpec?.is_virtual_machine || false,
      },
      benchmarkSpec: {
        cpu_hashrate_score: benchmarkScore?.cpu_hashrate_score || 0,
        memory_memcpy_score: benchmarkScore?.memory_memcpy_score || 0,
        disk_sequential_write_score:
          benchmarkScore?.disk_sequential_write_score || 0,
        disk_random_write_score: benchmarkScore?.disk_random_write_score || 0,
      },
      networkId: networkId,
    };
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(JSON.stringify(payload));
    logger.error(`Error parsing telemetry message`, { label: "Telemetry" });
    return null;
  }
};

export const fetchAndSetCandidateLocation = async (
  candidate: Candidate,
  telemetryNodeDetails: TelemetryNodeDetails,
) => {
  // See if there's an existing location for the given telemetry data
  const existingLocation = await getCandidateLocation(candidate.slotId);

  // Fetch and set a new location if:
  // - There's no existing location
  // - The ip address is different
  // - There isn't a stash address associated with the location
  // - There isn't a slotId associated with the location
  // - The location data is older than 2 days
  const shouldFetch =
    !existingLocation ||
    existingLocation?.addr != telemetryNodeDetails.ipAddress ||
    !existingLocation?.address ||
    !existingLocation?.slotId ||
    Date.now() - existingLocation?.updated > STALE_TELEMETRY_THRESHOLD; // The location data is older than 200 hours
  if (shouldFetch) {
    const iit = await getIIT();
    const { city, region, country, provider, v } = await fetchLocationInfo(
      telemetryNodeDetails.ipAddress,
      iit && iit.iit ? iit.iit : null,
    );
    await updateIITRequestCount();
    const slotId = candidate?.slotId;
    const stash = candidate?.stash;
    if (slotId == undefined || !stash) {
      logger.error(
        `No slotId or stash found for ${telemetryNodeDetails.name}`,
        {
          label: "Telemetry",
        },
      );
      logger.error(JSON.stringify(telemetryNodeDetails), {
        label: "Telemetry",
      });
      logger.error(JSON.stringify(candidate), { label: "Telemetry" });
      return;
    } else {
      await setLocation(
        slotId,
        stash,
        telemetryNodeDetails.name,
        telemetryNodeDetails.ipAddress,
        city,
        region,
        country,
        provider,
        telemetryNodeDetails.hardwareSpec,
        telemetryNodeDetails.networkId,
        v,
      );
    }
  }
};

export const initIIT = async (ipinfoToken: string): Promise<boolean> => {
  try {
    if (ipinfoToken) {
      await setIIT(ipinfoToken);
    } else {
      logger.warn(`No ip info api token set. ip info not enabled`, {
        label: "Telemetry",
      });
      await removeIIT();
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error initializing IIT`, { label: "Telemetry" });
    return false;
  }
};
