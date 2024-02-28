import {
  getIIT,
  getLocation,
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
    };
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(JSON.stringify(payload));
    logger.error(`Error parsing telemetry message`, { label: "Telemetry" });
    return null;
  }
};

export const fetchAndSetCandidateLocation = async (
  telemetryNodeDetails: TelemetryNodeDetails,
) => {
  const existingLocation = await getLocation(
    telemetryNodeDetails.name,
    telemetryNodeDetails.ipAddress,
  );
  const shouldFetch =
    !existingLocation ||
    existingLocation?.addr != telemetryNodeDetails.ipAddress ||
    !existingLocation?.address ||
    !existingLocation?.session ||
    Date.now() - existingLocation?.updated > STALE_TELEMETRY_THRESHOLD; // The location data is older than 200 hours
  if (shouldFetch) {
    const iit = await getIIT();
    const { city, region, country, provider, v } = await fetchLocationInfo(
      telemetryNodeDetails.ipAddress,
      iit && iit.iit ? iit.iit : null,
    );
    await updateIITRequestCount();
    await setLocation(
      telemetryNodeDetails.name,
      telemetryNodeDetails.ipAddress,
      city,
      region,
      country,
      provider,
      telemetryNodeDetails.hardwareSpec,
      v,
    );
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
