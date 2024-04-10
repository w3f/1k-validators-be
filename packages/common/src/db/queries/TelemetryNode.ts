import { TelemetryNodeDetails } from "../../types";
import {
  Candidate,
  CandidateModel,
  TelemetryNode,
  TelemetryNodeModel,
} from "../models";
import { dbLabel } from "../index";
import logger from "../../logger";

export const telemetryNodeExists = async (name: string): Promise<boolean> => {
  const exists = await TelemetryNodeModel.exists({ name });
  return !!exists;
};

export const deleteTelemetryNode = async (name: string): Promise<void> => {
  try {
    await TelemetryNodeModel.deleteOne({ name });
  } catch (e) {
    logger.error(JSON.stringify(e));
    const m = `Error deleting telemetry node ${name}`;
    logger.error(m, dbLabel);
    throw new Error(m);
  }
};

export const addNewTelemetryNode = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    const telemetryNode = new TelemetryNodeModel({
      name: telemetryNodeDetails.name,
      telemetryId: telemetryNodeDetails.telemetryId,
      nodeRefs: 1,
      version: telemetryNodeDetails.version,
      discoveredAt: telemetryNodeDetails.startupTime,
      onlineSince: telemetryNodeDetails.startupTime,
      offlineSince: 0,
      implementation: telemetryNodeDetails.nodeImplementation,
    });
    await telemetryNode.save();
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(
      `Error adding new telemetry node ${telemetryNodeDetails.name}`,
      dbLabel,
    );
    return false;
  }
};

export const updateTelemetryNodeOfflineTime = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    const telemetryNode = await TelemetryNodeModel.findOne({
      name: telemetryNodeDetails.name,
    }).lean<TelemetryNode>();

    if (telemetryNode && telemetryNode.offlineSince > 0) {
      const timeOffline = Date.now() - telemetryNode.offlineSince;
      const accumulated = (telemetryNode.offlineAccumulated || 0) + timeOffline;

      await TelemetryNodeModel.updateOne(
        { name: telemetryNodeDetails.name },
        {
          $set: {
            offlineSince: 0,
            offlineAccumulated: accumulated,
          },
        },
      );
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(
      `Error updating offline time for telemetry node ${telemetryNodeDetails.name}`,
      dbLabel,
    );
    return false;
  }
};

// Update the online status of an existing telemetry node
export const updateExistingTelemetryNode = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    // Update all the fields and increase node refs
    await TelemetryNodeModel.updateOne(
      { name: telemetryNodeDetails.name },
      {
        $set: {
          telemetryId: telemetryNodeDetails.telemetryId,
          version: telemetryNodeDetails.version,
          onlineSince: Date.now(),
          implementation: telemetryNodeDetails.nodeImplementation,
        },
        $inc: { nodeRefs: 1 },
      },
    );

    // Update any offline accumulated time
    await updateTelemetryNodeOfflineTime(telemetryNodeDetails);
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(
      `Error updating existing telemetry node ${telemetryNodeDetails.name}`,
      dbLabel,
    );
    return false;
  }
};

// Called when a telemetry message is received that a node is online
export const reportTelemetryNodeOnline = async (
  telemetryNodeDetails: TelemetryNodeDetails,
): Promise<boolean> => {
  try {
    const nodeExists = await telemetryNodeExists(telemetryNodeDetails.name);
    if (!nodeExists) {
      await addNewTelemetryNode(telemetryNodeDetails);
    } else {
      await updateExistingTelemetryNode(telemetryNodeDetails);
    }
    logger.info(
      `Telemetry node ${telemetryNodeDetails.name} with id: ${telemetryNodeDetails.telemetryId} is  online`,
      {
        label: "Telemetry",
      },
    );
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(
      `Error reporting telemetry node online ${telemetryNodeDetails.name}`,
      dbLabel,
    );
    return false;
  }
};

export const getTelemetryNode = async (
  name: string,
): Promise<TelemetryNode | null> => {
  return TelemetryNodeModel.findOne({ name }).lean<TelemetryNode>();
};

export const allTelemetryNodes = async (): Promise<TelemetryNode[]> => {
  return TelemetryNodeModel.find({}).lean<TelemetryNode[]>();
};

// If there's a candidate online with the same name as the telemetry node, we transfer telemetry to a candidate and delete the telemetry node
export const mergeTelemetryNodeToCandidate = async (
  candidate: Candidate,
): Promise<void> => {
  const telemetryNode = await getTelemetryNode(candidate.name);
  if (telemetryNode) {
    // update candidate with telemetry details
    await CandidateModel.findOneAndUpdate(
      { slotId: candidate.slotId },
      {
        telemetryId: telemetryNode?.telemetryId,
        version: telemetryNode?.version,
        // onlineSince: telemetryNode?.onlineSince,
        discoveredAt: telemetryNode?.discoveredAt,
        offlineAccumulated: telemetryNode?.offlineAccumulated,
        nodeRefs: telemetryNode?.nodeRefs,
      },
    ).exec();

    await deleteTelemetryNode(candidate.name);
  }
};

export const reportTelemetryNodeOffline = async (
  name: string,
): Promise<boolean> => {
  try {
    const telemetryNode = await getTelemetryNode(name);
    if (telemetryNode) {
      if (telemetryNode.nodeRefs > 1) {
        await TelemetryNodeModel.updateOne(
          { name },
          { $inc: { nodeRefs: -1 } },
        );
      } else {
        await TelemetryNodeModel.updateOne(
          { name },
          {
            $set: {
              offlineSince: Date.now(),
              onlineSince: 0,
            },
            $inc: { nodeRefs: -1 },
          },
        );
      }
    }
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error reporting telemetry node offline ${name}`, dbLabel);
    return false;
  }
};

export const clearTelemetryNodeNodeRefsFrom = async (
  name: string,
): Promise<boolean> => {
  try {
    await TelemetryNodeModel.updateOne(
      { name },
      {
        $set: {
          nodeRefs: 0,
        },
      },
    );
    return true;
  } catch (e) {
    logger.error(JSON.stringify(e));
    logger.error(`Error clearing telemetry node nodeRefs ${name}`, dbLabel);
    return false;
  }
};
