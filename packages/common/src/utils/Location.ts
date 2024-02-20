import { getIIT, getLocation, setLocation } from "../db";
import { fetchLocationInfo } from "./util";
import { TelemetryNodeDetails } from "../types";

export const nodeDetailsFromTelemetryMessage = (
  payload,
): TelemetryNodeDetails => {
  const [
    id,
    [
      name,
      nodeImplementation,
      version,
      address,
      networkId,
      addr,
      {
        cpu,
        memory,
        core_count,
        linux_kernel,
        linux_distro,
        is_virtual_machine,
      },
      {
        cpu_hashrate_score,
        memory_memcpy_score,
        disk_sequential_write_score,
        disk_random_write_score,
      },
    ],
    nodeStats,
    nodeIO,
    nodeHardware,
    blockDetails,
    location,
    startupTime,
  ] = payload;

  return {
    telemetryId: id,
    name: name,
    nodeImplementation: nodeImplementation,
    version: version,
    ipAddress: addr,
    startupTime: startupTime,
    hardwareSpec: {
      cpu: cpu,
      memory: memory,
      core_count: core_count,
      linux_kernel: linux_kernel,
      linux_distro: linux_distro,
      is_virtual_machine: is_virtual_machine,
    },
    benchmarkSpec: {
      cpu_hashrate_score: cpu_hashrate_score,
      memory_memcpy_score: memory_memcpy_score,
      disk_sequential_write_score: disk_sequential_write_score,
      disk_random_write_score: disk_random_write_score,
    },
  };
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
    Date.now() - existingLocation?.updated > 720000000; // The location data is older than 200 hours
  if (shouldFetch) {
    const iit = await getIIT();
    const { city, region, country, provider, v } = await fetchLocationInfo(
      telemetryNodeDetails.ipAddress,
      iit && iit.iit ? iit.iit : null,
    );
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
