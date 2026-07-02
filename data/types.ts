export type DeviceStatus = "online" | "offline" | "warning";
export type DeviceSystem = "Windows" | "Linux" | "macOS" | "Android" | "iOS" | "Other";
export type DeviceType = "电脑" | "主机" | "手机" | "网关" | "音响" | "小车" | "盒子";
export type LogLevel = "info" | "success" | "warning" | "error";
export type CommandResult = "成功" | "失败" | "等待确认";

export type DeviceMetric = {
  label: string;
  value: string;
  tone?: "normal" | "success" | "warning" | "danger";
};

export type Device = {
  id: string;
  name: string;
  serial: string;
  type: DeviceType;
  system: DeviceSystem;
  status: DeviceStatus;
  model: string;
  group: string;
  ip: string;
  host: string;
  port: number;
  pairingTokenConfigured: boolean;
  connection: string;
  currentTask: string;
  lastHeartbeat: string;
  lastCommand: string;
  note: string;
  metrics: DeviceMetric[];
  quickActions: string[];
};

export type CommandLog = {
  id: string;
  time: string;
  level: LogLevel;
  message: string;
};

export type CommandHistory = {
  id: string;
  command: string;
  result: CommandResult;
  time: string;
  target: string;
  source?: "文本" | "语音";
  deviceId?: string;
  highRisk?: boolean;
  detail: string;
};

export type StageStatus = "done" | "active" | "waiting" | "error";

export type CommandStage = {
  key: string;
  label: string;
  status: StageStatus;
};

export type SettingItem = {
  label: string;
  value?: string;
  icon: string;
  danger?: boolean;
  disabled?: boolean;
  route?: string;
};

export type SettingGroup = {
  title: string;
  items: SettingItem[];
};
