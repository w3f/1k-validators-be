import { initTestServerBeforeAll } from "./testUtils/dbUtils";

process.on("unhandledRejection", (reason, promise) => {
  console.warn("Ignored Unhandled Rejection:", reason);
});

initTestServerBeforeAll();
