import { initTestServerBeforeAll } from "./testUtils/dbUtils";

console.log("Global Vitest setup executing...");

process.on("unhandledRejection", (reason, promise) => {
  console.warn("Ignored Unhandled Rejection:", reason);
});

initTestServerBeforeAll();
