import { Config } from "../../src/config";
import Db from "../../src/db";
import TelemetryClient from "../../src/telemetry";

const MockConfig = {
  telemetry: {
    chains: ["Kusama"],
    host: "wss://telemetry-backend.w3f.community/feed",
  },
};

const MockDb = {
  reportOnline: (id: any, details: any, now: any) => {
    console.log(
      `(reportOnline) id: ${id} | details: ${JSON.stringify(details, null, 2)}`
    );
  },
  reportOffline: (id: any, name: any, now: any) => {
    console.log(`(reportOffline) id: ${id} | name: ${name}`);
  },
};

const Test = async () => {
  const tClient = new TelemetryClient(MockConfig as Config, MockDb as Db);

  await tClient.start();
};

try {
  Test();
} catch (err) {
  console.error(err);
}
