import Monitor from "../../src/monitor";

const Db = {};

const Test = async () => {
  const monitor = new Monitor(Db as any, 10);
  const latest = await monitor.getLatestTaggedRelease();
  console.log(latest);
};

try {
  Test();
} catch (err) {
  console.error(err);
}
