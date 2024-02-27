import TelemetryClient from "./Telemetry";
import { logger } from "@1kv/common";
import { deserialize, handleTelemetryMessage } from "./TelemetryMessage";
import WebSocket from "ws";

export const registerTelemetryWs = async (telemetryClient: TelemetryClient) => {
  try {
    telemetryClient.initializeWebSocket();
    telemetryClient.socket.on("open", () => {
      logger.info("[Telemetry] Connection opened", { label: "Telemetry" });
      telemetryClient.chains.forEach((chain) =>
        subscribeWs(telemetryClient.socket, chain),
      );
    });

    telemetryClient.socket.on("close", async () => {
      logger.info(
        `Connection to substrate-telemetry on host ${telemetryClient.host} closed, retrying...`,
        { label: "Telemetry" },
      );
      await telemetryClient.reconnect();
    });

    telemetryClient.socket.on("error", async (error) => {
      logger.error(
        `WebSocket error on host ${telemetryClient.host}: ${error.message}`,
        { label: "Telemetry" },
      );
      await telemetryClient.reconnect();
    });

    telemetryClient.socket.on("message", (msg) => {
      try {
        const messages = deserialize(msg);
        messages.forEach((message) =>
          handleTelemetryMessage(telemetryClient, message),
        );
      } catch (error) {
        logger.error(`Error parsing telemetry message: ${error}`, {
          label: "Telemetry",
        });
      }
    });
  } catch (e) {
    logger.error(`Telemetry error registering socket`, { label: "Telemetry" });
    logger.error(JSON.stringify(e), { label: "Telemetry" });
  }
};

export const subscribeWs = async (socket: WebSocket, chain: string) => {
  try {
    logger.info(`Connected to substrate-telemetry for chain: ${chain}`, {
      label: "Telemetry",
    });
    // socket.send(`ping:${chain}`);
    socket.send(`subscribe:${chain}`);
  } catch (e) {
    logger.error(`Telemetry error subscribing socket`, { label: "Telemetry" });
    logger.error(JSON.stringify(e), { label: "Telemetry" });
  }
};
