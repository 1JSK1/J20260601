import {
  CommandReplayRequest,
  CommandReplayResponse,
  ConnectionTestRequest,
  ConnectionTestResponse,
  DeviceActionRequest,
  DeviceActionResponse
} from "./apiTypes";

export type ApiMode = "mock" | "http";

export type ApiRuntimeConfig = {
  mode: ApiMode;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  userId: string;
  sessionId?: string;
};

export type ApiAdapter = {
  runDeviceAction: (request: DeviceActionRequest, config: ApiRuntimeConfig) => Promise<DeviceActionResponse>;
  replayCommand: (request: CommandReplayRequest, config: ApiRuntimeConfig) => Promise<CommandReplayResponse>;
  testConnection: (request: ConnectionTestRequest, config: ApiRuntimeConfig) => Promise<ConnectionTestResponse>;
};
