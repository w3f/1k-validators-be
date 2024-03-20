import { initTestServerBeforeAll } from "./utils";

process.on("unhandledRejection", (reason, promise) => {
  console.warn("Ignored Unhandled Rejection:", reason);
});

initTestServerBeforeAll();
