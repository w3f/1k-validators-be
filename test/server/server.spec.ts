import axios from "axios";

import Server from "../../src/server";

const MockConfig = {
  server: {
    port: 3123,
  },
};
const MockDb = {
  allCandidates: () => true,
  allNodes: () => true,
  allNominators: () => true,
  getAccounting: (stash: string) => stash,
};
const MockSk = {
  constraints: {
    validCandidateCache: "valid",
    invalidCandidateCache: [null, "invalid", null],
  },
};

const Test = async () => {
  const ax = axios.create({
    baseURL: "http://localhost:3123",
  });

  const server = new Server(MockDb as any, MockConfig as any, MockSk as any);
  server.start();

  const res = await ax.get("/accounting/bleh");

  if (res.data != "bleh") {
    throw new Error("Server returned an incorrect value.");
  }

  console.log("No errors!");
  process.exit(0);
};

try {
  Test();
} catch (err) {
  console.error(err);
}
