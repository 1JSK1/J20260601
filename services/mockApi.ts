import { commandHistory, commandLogs, commandStages, deviceLogs, devices, settingGroups } from "@/data/mock";
import { CommandHistory, Device, SettingGroup } from "@/data/types";

const latency = 180;

function wait<T>(value: T, delay = latency): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

export type DeviceListResponse = {
  devices: Device[];
  stats: {
    total: number;
    online: number;
    offline: number;
    warning: number;
  };
};

export type CommandDashboardResponse = {
  stages: typeof commandStages;
  logs: typeof commandLogs;
  history: CommandHistory[];
};

export const mockApi = {
  async getDevices(): Promise<DeviceListResponse> {
    return wait({
      devices,
      stats: {
        total: devices.length,
        online: devices.filter((item) => item.status === "online").length,
        offline: devices.filter((item) => item.status === "offline").length,
        warning: devices.filter((item) => item.status === "warning").length
      }
    });
  },

  async getDevice(id: string): Promise<Device | null> {
    return wait(devices.find((item) => item.id === id) ?? null);
  },

  async getDeviceLogs() {
    return wait(deviceLogs);
  },

  async getCommandDashboard(): Promise<CommandDashboardResponse> {
    return wait({
      stages: commandStages,
      logs: commandLogs,
      history: commandHistory
    });
  },

  async getCommand(id: string): Promise<CommandHistory | null> {
    return wait(commandHistory.find((item) => item.id === id) ?? null);
  },

  async getCommandLogs() {
    return wait(commandLogs);
  },

  async getSettingGroups(): Promise<SettingGroup[]> {
    return wait(settingGroups);
  }
};
