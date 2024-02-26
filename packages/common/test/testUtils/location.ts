import { setLatestSession, setLocation } from "../../src/db/queries";
import { addKusamaCandidates } from "./candidate";

export const kusamaLocations = [
  {
    name: "Blockshard",
    address: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
    addr: "185.101.157.119",
    city: "Zürich",
    region: "Zurich",
    country: "CH",
    provider: "hosttech GmbH",
    updated: 1708250497931,
    session: 37024,
    source: "Telemetry",
    vpn: false,
    cpu: "AMD Ryzen 7 2700 Eight-Core Processor",
    memory: "33683795968",
    coreCount: "8",
    vm: false,
  },
  {
    name: "Blockshard",
    address: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
    addr: "185.101.157.119",
    city: "Zürich",
    region: "Zurich",
    country: "CH",
    provider: "hosttech GmbH",
    updated: 1679765858271,
    session: 29111,
    source: "Telemetry",
    vpn: false,
    cpu: "AMD Ryzen 7 2700 Eight-Core Processor",
    memory: "33683795968",
    coreCount: "8",
    vm: false,
  },
  {
    name: "Blockshard",
    address: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
    addr: "185.101.157.119",
    city: "Zürich",
    region: "Zurich",
    country: "CH",
    provider: "hosttech GmbH",
    updated: 1679855362431,
    session: 29136,
    source: "Telemetry",
    vpn: false,
    cpu: "AMD Ryzen 7 2700 Eight-Core Processor",
    memory: "33683795968",
    coreCount: "8",
    vm: false,
  },
  {
    name: "Blockshard",
    address: "Cp4U5UYg2FaVUpyEtQgfBm9aqge6EEPkJxEFVZFYy7L1AZF",
    addr: "185.101.157.119",
    city: "Zürich",
    region: "Zurich",
    country: "CH",
    provider: "hosttech GmbH",
    updated: 1679942849630,
    session: 29161,
    source: "Telemetry",
    vpn: false,
    cpu: "AMD Ryzen 7 2700 Eight-Core Processor",
    memory: "33683795968",
    coreCount: "8",
    vm: false,
  },
];

export const addKusamaLocations = async () => {
  await addKusamaCandidates();
  for (const location of kusamaLocations) {
    await setLatestSession(location.session);
    const didSet = await setLocation(
      location.name,
      location.addr,
      location.city,
      location.region,
      location.country,
      location.provider,
      {
        linux_distro: "",
        linux_kernel: "",
        cpu: location.cpu,
        memory: location.memory,
        core_count: location.coreCount,
        is_virtual_machine: location.vm,
      },
      location.vpn,
    );
    console.log(`Set location: ${didSet}`);
  }
};
