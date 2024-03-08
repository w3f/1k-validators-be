console.log("Global Vitest setup executing...");

process.on("unhandledRejection", (reason, promise) => {
  console.warn("Ignored Unhandled Rejection:", reason);
});
