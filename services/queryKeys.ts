export const queryKeys = {
  devices: ["devices"] as const,
  device: (id: string) => ["device", id] as const,
  deviceLogs: (id: string) => ["device", id, "logs"] as const,
  commandDashboard: ["command-dashboard"] as const,
  command: (id: string) => ["command", id] as const,
  commandLogs: (id: string) => ["command", id, "logs"] as const,
  settingGroups: ["setting-groups"] as const,
  tencentSpeechConfig: (userId?: string) => ["tencent-speech-config", userId ?? "guest"] as const
};
