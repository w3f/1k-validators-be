import { vi } from "vitest";

export const setupMetrics = vi.fn();
export const registerBlockScan = vi.fn();
export const registerNomination = vi.fn();
export const setDbConnectivity = vi.fn();
export const setTelemetryConnectivity = vi.fn();
export const setChainRpcConnectivity = vi.fn();
export const renderMetrics = vi.fn(() => Promise.resolve(""));
