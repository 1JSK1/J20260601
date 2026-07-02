import {
  CommandReplayRequest,
  CommandReplayResponse,
  ConnectionTestRequest,
  ConnectionTestResponse,
  DeviceActionRequest,
  DeviceActionResponse
} from "./apiTypes";
import { ApiRuntimeConfig } from "./apiAdapter";
import { httpAdapter } from "./httpAdapter";
import { mockAdapter } from "./mockAdapter";

function getAdapter(config: ApiRuntimeConfig) {
  return config.mode === "http" ? httpAdapter : mockAdapter;
}

export const apiClient = {
  async runDeviceAction(request: DeviceActionRequest, config: ApiRuntimeConfig): Promise<DeviceActionResponse> {
    return getAdapter(config).runDeviceAction(request, config);
  },

  async replayCommand(request: CommandReplayRequest, config: ApiRuntimeConfig): Promise<CommandReplayResponse> {
    return getAdapter(config).replayCommand(request, config);
  },

  async testConnection(request: ConnectionTestRequest, config: ApiRuntimeConfig): Promise<ConnectionTestResponse> {
    return getAdapter(config).testConnection(request, config);
  }
};
