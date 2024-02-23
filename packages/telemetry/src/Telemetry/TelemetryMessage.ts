import { TelemetryMessage } from "../types";
import { logger, queries, Types, Util } from "@1kv/common";
import TelemetryClient from "../telemetry";

export const deserialize = (
  msg: any,
): Array<{ action: number; payload: any }> => {
  const data = JSON.parse(msg);
  const messages = new Array(data.length / 2);

  for (const index of messages.keys()) {
    const [action, payload] = data.slice(index * 2);
    // eslint-disable-next-line security/detect-object-injection
    messages[index] = { action, payload };
  }

  return messages;
};

export const handleTelemetryMessage = async (
  telemetryClient: TelemetryClient,
  message: { action: TelemetryMessage; payload: any },
) => {
  const { action, payload } = message;

  // Check if there were any disconnected nodes that reach the threshold of being 'offline'
  if (telemetryClient.disconnectedNodes.size > 0) {
    await telemetryClient.checkOffline();
  }

  switch (action) {
    case TelemetryMessage.FeedVersion:
      await handleTelemetryFeedVersion(payload);
      break;
    case TelemetryMessage.AddedNode:
      await handleAddedNode(telemetryClient, payload);
      break;
    case TelemetryMessage.RemovedNode:
      await handleRemovedNode(telemetryClient, payload);
      break;
    case TelemetryMessage.ImportedBlock:
      await handleImportedBlock(telemetryClient, payload);
      break;
    default:
  }
};

export const handleTelemetryFeedVersion = async (payload: any) => {
  logger.info(`feed version: ${JSON.stringify(payload)}`, {
    label: "Telemetry",
  });
};

export const handleAddedNode = async (
  telemetryClient: TelemetryClient,
  payload: any,
) => {
  try {
    if (payload == null) return;
    const [
      id,
      details,
      nodeStats,
      nodeIO,
      nodeHardware,
      blockDetails,
      location,
      startupTime,
    ] = payload;

    const now = Date.now();

    // Cache the node details, key'd by telemetry id
    telemetryClient.memNodes[parseInt(id)] = details;
    const name = details[0];

    const telemetryNodeDetails: Types.TelemetryNodeDetails =
      Util.nodeDetailsFromTelemetryMessage(payload);

    // Report the node as online
    await queries.reportOnline(telemetryNodeDetails);

    // If the node was offline
    const wasOffline = telemetryClient.offlineNodes.has(name);
    if (wasOffline) {
      const offlineAt = telemetryClient.offlineNodes.get(name);
      const offlineTime = now - offlineAt;
      telemetryClient.offlineNodes.delete(name);
      logger.info(
        `node ${name} id: ${id} that was offline is now online. Offline time: ${
          offlineTime / 1000 / 60
        } minutes `,
        {
          label: "Telemetry",
        },
      );
    }
    const wasDisconnected = telemetryClient.disconnectedNodes.has(name);
    if (wasDisconnected) {
      const disconnectedAt = telemetryClient.disconnectedNodes.get(name);
      const disconnectedTime = now - disconnectedAt;
      telemetryClient.disconnectedNodes.delete(name);
      logger.info(
        `node ${name} id: ${id} that was disconnected is now online. Disconnection time: ${
          disconnectedTime / 1000 / 60
        } minutes`,
        {
          label: "Telemetry",
        },
      );
    }
  } catch (e) {
    logger.error(e.toString());
    logger.error(JSON.stringify(payload));
  }
};

export const handleRemovedNode = async (
  telemetryClient: TelemetryClient,
  payload: any,
) => {
  const id = parseInt(payload);
  const now = Date.now();

  //this is to get around security warning vvv
  const details = telemetryClient.memNodes[id];

  // remove from cache
  telemetryClient.memNodes[id] = null;

  if (!details) {
    logger.info(`Unknown node with ${id} reported offline.`);
    return;
  }

  const name = details[0];

  telemetryClient.disconnectedNodes.set(name, now);
};

export const handleImportedBlock = async (
  telemetryClient: TelemetryClient,
  payload: any,
) => {
  const [id, blockDetails] = payload;
  const now = Date.now();

  // const mem = telemetryClient.memNodes[id];
  // if (!mem) {
  //   logger.warn(`id: ${id} is not cached`, { label: "Telemetry" });
  //   return;
  // }
  // const name = mem[0];
  //
  // const wasOffline = telemetryClient.offlineNodes.has(name);
  // if (wasOffline) {
  //   const offlineAt = telemetryClient.offlineNodes.get(name);
  //   const offlineTime = now - offlineAt;
  //   telemetryClient.offlineNodes.delete(name);
  //   logger.warn(
  //     `node ${name} id: ${id} that was offline has a new block. Offline time: ${
  //       offlineTime / 1000 / 60
  //     } minutes `,
  //     {
  //       label: "Telemetry",
  //     },
  //   );
  // }
  // const wasDisconnected = telemetryClient.disconnectedNodes.has(name);
  // if (wasDisconnected) {
  //   const disconnectedAt = telemetryClient.disconnectedNodes.get(name);
  //   const disconnectedTime = now - disconnectedAt;
  //   telemetryClient.disconnectedNodes.delete(name);
  //   logger.warn(
  //     `node ${name} id: ${id} that was disconnected has a new block. Disconnection time: ${
  //       disconnectedTime / 1000 / 60
  //     } minutes`,
  //     {
  //       label: "Telemetry",
  //     },
  //   );
  // }
};
