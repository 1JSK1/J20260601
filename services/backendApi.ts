import { commandLogs, commandStages } from "@/data/mock";
import type { CommandDashboardResponse, DeviceListResponse } from "@/services/mockApi";
import type { CommandHistory, CommandLog, Device, DeviceSystem, LogLevel } from "@/data/types";
import type { ApiRuntimeConfig } from "@/services/apiAdapter";
import { ApiError } from "@/services/apiTypes";

type BackendDevice = {
  id: string;
  name: string;
  host: string;
  port: number;
  pairing_token: string;
  system: string;
  type: string;
  group_name: string;
  note: string;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
};

type BackendCommand = {
  id: string;
  device_id: string;
  action: string;
  payload: string;
  status: string;
  result: string;
  created_at: string;
};

type BackendDeviceLog = {
  id: string;
  device_id: string;
  level: string;
  message: string;
  created_at: string;
};

type ActionResult = {
  ok: boolean;
  command_id?: string;
  message: string;
  agent_response?: Record<string, unknown> | null;
};

export type AddManualDeviceRequest = {
  name: string;
  host: string;
  port: number;
  pairingToken: string;
  system?: string;
  type?: string;
  groupName?: string;
  note?: string;
};

export type AgentTestResult = {
  ok: boolean;
  message: string;
  agent: Record<string, unknown> | null;
  checked_at: string;
};

export type AddManualDeviceResponse = {
  device: Device;
  test: AgentTestResult;
};

export type UpdateDeviceRequest = {
  deviceId: string;
  name: string;
  host: string;
  port: number;
  groupName: string;
  note: string;
  pairingToken?: string;
};

export type UpdateDeviceResponse = {
  device: Device;
  test: AgentTestResult;
};

export type DeviceQuickActionRequest = {
  deviceId: string;
  action: "open-url" | "open-app" | "test";
};

export type DeviceQuickActionResponse = {
  ok: boolean;
  message: string;
};

export type TextCommandRequest = {
  text: string;
  targetDeviceIds?: string[];
  requireExplicitTarget?: boolean;
  source?: "text" | "voice";
};

export type TextCommandResponse = {
  ok: boolean;
  message: string;
  targetDeviceIds?: string[];
  targetDeviceName?: string;
  commandIds?: string[];
  logs: Array<{ level: "info" | "success" | "warning" | "error"; message: string }>;
};

export type TargetDeviceMatch = {
  id: string;
  name: string;
  system: string;
  type: string;
  group: string;
};

export type TargetResolution =
  | { status: "matched"; devices: TargetDeviceMatch[]; isBatch: boolean }
  | { status: "missing"; devices: [] }
  | { status: "ambiguous"; devices: TargetDeviceMatch[] }
  | { status: "not_found"; devices: [] };

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function requestJson<T>(config: ApiRuntimeConfig, path: string, init?: RequestInit): Promise<T> {
  if (!config.baseUrl) {
    throw new ApiError("NETWORK_ERROR", "后端 Base URL 不能为空");
  }
  if (!config.sessionId) {
    throw new ApiError("UNAUTHORIZED", "请先登录账号");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs || 8000);

  try {
    const response = await fetch(joinUrl(config.baseUrl, path), {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Session-Id": config.sessionId,
        ...(init?.headers ?? {})
      }
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message = data?.detail || data?.message || `后端请求失败：HTTP ${response.status}`;
      throw new ApiError(response.status === 404 ? "NOT_FOUND" : "NETWORK_ERROR", message);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const rawMessage = error instanceof Error ? error.message : "";
    const message =
      rawMessage === "Failed to fetch" || rawMessage.includes("Network request failed")
        ? "无法连接到 App 后端：请先运行 python backend\\run.py --host 127.0.0.1 --port 8008"
        : rawMessage || "无法连接到 App 后端";
    throw new ApiError("NETWORK_ERROR", message);
  } finally {
    clearTimeout(timer);
  }
}

function toSystem(value: string | undefined): DeviceSystem {
  const systems: DeviceSystem[] = ["Windows", "Linux", "macOS", "Android", "iOS", "Other"];
  return systems.includes(value as DeviceSystem) ? (value as DeviceSystem) : "Other";
}

function toDeviceType(value: string | undefined): Device["type"] {
  const normalized = (value || "").toLowerCase();
  if (normalized.includes("phone") || normalized.includes("android") || normalized.includes("ios")) {
    return "手机" as Device["type"];
  }
  if (normalized.includes("server") || normalized.includes("host")) {
    return "主机" as Device["type"];
  }
  if (normalized.includes("gateway") || normalized.includes("router")) {
    return "网关" as Device["type"];
  }
  if (normalized.includes("speaker")) {
    return "音响" as Device["type"];
  }
  if (normalized.includes("car")) {
    return "小车" as Device["type"];
  }
  return "电脑" as Device["type"];
}

function formatTime(value: string) {
  if (!value) return "等待同步";
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return formatDateTimeSeconds(normalized);
}

function formatDateTimeSeconds(value: string | null | undefined) {
  if (!value) return "尚未连接";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.replace("T", " ").slice(0, 19);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(parsed);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function readAgentString(test: AgentTestResult | null | undefined, key: string) {
  const value = test?.agent?.[key];
  return typeof value === "string" ? value : undefined;
}

function mapDevice(device: BackendDevice, test?: AgentTestResult | null): Device {
  const agentSystem = readAgentString(test, "system");
  const agentType = readAgentString(test, "type");
  const agentVersion = readAgentString(test, "agent_version");
  const agentDeviceId = readAgentString(test, "device_id");
  const capabilities = Array.isArray(test?.agent?.capabilities) ? test.agent.capabilities : [];
  const system = toSystem(agentSystem || device.system);
  const type = toDeviceType(agentType || device.type);
  const tested = Boolean(test);
  const online = Boolean(test?.ok);

  return {
    id: device.id,
    name: device.name,
    serial: agentDeviceId || device.id,
    type,
    system,
    status: !tested ? "warning" : online ? "online" : "offline",
    model: agentVersion ? `Lite Agent ${agentVersion}` : "Lite Agent 设备",
    group: device.group_name || "默认分组",
    ip: `${device.host}:${device.port}`,
    host: device.host,
    port: device.port,
    pairingTokenConfigured: Boolean(device.pairing_token),
    connection: !tested ? "等待连接测试" : online ? "局域网在线" : `连接失败：${test?.message || "Agent 不可达"}`,
    currentTask: online ? "等待主控指令" : "无法连接到设备 Agent",
    lastHeartbeat: formatDateTimeSeconds(test?.ok ? test.checked_at : device.last_heartbeat_at),
    lastCommand: "暂无真实指令",
    note: device.note || "通过 App 后端登记的局域网设备。",
    metrics: [
      { label: "Agent", value: online ? "在线" : tested ? "离线" : "未测试", tone: online ? "success" : tested ? "warning" : "normal" },
      { label: "能力", value: `${capabilities.length} 项` },
      { label: "端口", value: String(device.port) },
      { label: "延迟", value: online ? "可达" : "--" }
    ],
    quickActions: ["打开浏览器", "打开应用", "测试连接"]
  };
}

function mapCommand(command: BackendCommand, deviceNameById?: Record<string, string>): CommandHistory {
  let payload: Record<string, unknown> = {};
  try {
    payload = command.payload ? JSON.parse(command.payload) : {};
  } catch {
    payload = {};
  }
  const appText: Record<string, string> = {
    notepad: "记事本",
    calculator: "计算器",
    calc: "计算器",
    cmd: "命令行",
    explorer: "资源管理器"
  };
  const app = typeof payload.app === "string" ? payload.app : "";
  const url = typeof payload.url === "string" ? payload.url : "";
  const actionText: Record<string, string> = {
    "open-url": url ? `打开浏览器：${url}` : "打开浏览器",
    "open-app": app ? `打开${appText[app] ?? app}` : "打开应用",
    "test-connection": "测试连接",
    unsupported: "不支持的指令"
  };
  const source = payload.source === "voice" ? "语音" : "文本";
  const originalCommand = typeof payload.original_command === "string" ? payload.original_command : "";

  return {
    id: command.id,
    command: originalCommand || (actionText[command.action] ?? command.action),
    result: command.status === "success" ? ("成功" as CommandHistory["result"]) : ("失败" as CommandHistory["result"]),
    time: formatTime(command.created_at),
    target: deviceNameById?.[command.device_id] ?? command.device_id,
    source,
    deviceId: command.device_id,
    detail: command.result
  };
}

function mapDeviceLog(log: BackendDeviceLog): CommandLog {
  const levels: LogLevel[] = ["info", "success", "warning", "error"];
  const level = levels.includes(log.level as LogLevel) ? (log.level as LogLevel) : "info";

  return {
    id: log.id,
    time: formatTime(log.created_at),
    level,
    message: log.message
  };
}

async function testDevice(config: ApiRuntimeConfig, deviceId: string): Promise<AgentTestResult> {
  return requestJson<AgentTestResult>(config, `/devices/${deviceId}/test`, {
    method: "POST",
    body: "{}"
  });
}

async function recordCommand(
  config: ApiRuntimeConfig,
  payload: {
    deviceId: string;
    action: string;
    originalCommand: string;
    source: "text" | "voice";
    status: "success" | "failed";
    result: string;
  }
) {
  return requestJson<BackendCommand>(config, "/commands/records", {
    method: "POST",
    body: JSON.stringify({
      device_id: payload.deviceId,
      action: payload.action,
      original_command: payload.originalCommand,
      source: payload.source,
      status: payload.status,
      result: payload.result
    })
  });
}

async function safeTestDevice(config: ApiRuntimeConfig, deviceId: string): Promise<AgentTestResult | null> {
  try {
    return await testDevice(config, deviceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent 不可达";
    return { ok: false, message, agent: null, checked_at: new Date().toISOString() };
  }
}

function extractUrl(text: string) {
  const match = text.match(/https?:\/\/[^\s，。]+/i);
  return match?.[0] ?? "https://www.baidu.com";
}

function resolveAppAlias(text: string) {
  const normalized = text.toLowerCase();
  if (text.includes("计算器") || normalized.includes("calculator")) return "calculator";
  if (text.includes("命令行") || normalized.includes("cmd")) return "cmd";
  if (text.includes("资源管理器") || normalized.includes("explorer")) return "explorer";
  return "notepad";
}

function toTargetDeviceMatch(device: BackendDevice): TargetDeviceMatch {
  return {
    id: device.id,
    name: device.name,
    system: device.system,
    type: device.type,
    group: device.group_name
  };
}

function normalizeTargetText(value: string) {
  return value.toLowerCase().replace(/[\s，。！？、,.!?]/g, "");
}

function includesAny(value: string, candidates: string[]) {
  return candidates.some((candidate) => candidate && value.includes(normalizeTargetText(candidate)));
}

function deviceNameAliases(device: BackendDevice) {
  return [device.name, ...device.name.split(/[\s/_-]+/).filter((part) => part.length >= 2)];
}

function deviceTargetAliases(device: BackendDevice) {
  const type = device.type.toLowerCase();
  const system = device.system.toLowerCase();
  const aliases = [...deviceNameAliases(device), device.system, device.type, device.group_name];

  if (type.includes("computer") || type.includes("pc") || system.includes("windows") || system.includes("mac")) {
    aliases.push("电脑", "计算机");
  }
  if (type.includes("server") || type.includes("host")) aliases.push("主机", "服务器");
  if (type.includes("phone") || system.includes("android") || system.includes("ios")) aliases.push("手机");
  if (type.includes("gateway") || type.includes("router")) aliases.push("网关", "路由器");
  if (type.includes("speaker")) aliases.push("音响");
  if (type.includes("car")) aliases.push("小车");

  return aliases;
}

function matchesDeviceTarget(device: BackendDevice, normalizedText: string) {
  return includesAny(normalizedText, deviceTargetAliases(device));
}

function isBatchTarget(normalizedText: string) {
  return includesAny(normalizedText, ["全部", "所有", "全体", "每台"]);
}

function hasDeviceTargetHint(normalizedText: string, devices: BackendDevice[]) {
  const genericHints = [
    "设备",
    "电脑",
    "计算机",
    "主机",
    "手机",
    "网关",
    "音响",
    "小车",
    "windows",
    "linux",
    "macos",
    "android",
    "ios"
  ];
  return includesAny(normalizedText, genericHints) || devices.some((device) => matchesDeviceTarget(device, normalizedText));
}

function resolveTargetsFromDevices(devices: BackendDevice[], text: string): TargetResolution {
  const normalizedText = normalizeTargetText(text);
  if (!normalizedText) return { status: "missing", devices: [] };

  const exactNameMatches = devices.filter((device) => normalizedText.includes(normalizeTargetText(device.name)));
  if (exactNameMatches.length > 0) {
    return {
      status: "matched",
      devices: exactNameMatches.map(toTargetDeviceMatch),
      isBatch: exactNameMatches.length > 1
    };
  }

  const nameMatches = devices.filter((device) => includesAny(normalizedText, deviceNameAliases(device)));
  if (nameMatches.length === 1) {
    return { status: "matched", devices: nameMatches.map(toTargetDeviceMatch), isBatch: false };
  }
  if (nameMatches.length > 1 && isBatchTarget(normalizedText)) {
    return { status: "matched", devices: nameMatches.map(toTargetDeviceMatch), isBatch: true };
  }
  if (nameMatches.length > 1) {
    return { status: "ambiguous", devices: nameMatches.map(toTargetDeviceMatch) };
  }

  const matches = devices.filter((device) => matchesDeviceTarget(device, normalizedText));
  const batch = isBatchTarget(normalizedText);
  if (matches.length === 1) {
    return { status: "matched", devices: matches.map(toTargetDeviceMatch), isBatch: false };
  }
  if (matches.length > 1 && batch) {
    return { status: "matched", devices: matches.map(toTargetDeviceMatch), isBatch: true };
  }
  if (matches.length > 1) {
    return { status: "ambiguous", devices: matches.map(toTargetDeviceMatch) };
  }
  if (batch && includesAny(normalizedText, ["全部设备", "所有设备"])) {
    return { status: "matched", devices: devices.map(toTargetDeviceMatch), isBatch: true };
  }
  return hasDeviceTargetHint(normalizedText, devices)
    ? { status: "not_found", devices: [] }
    : { status: "missing", devices: [] };
}

async function getBackendDevices(config: ApiRuntimeConfig) {
  const devices = await requestJson<BackendDevice[]>(config, "/devices");
  if (devices.length === 0) {
    throw new ApiError("NOT_FOUND", "还没有可用设备，请先添加一台局域网设备。");
  }
  return devices;
}

async function resolveTargetDevices(
  config: ApiRuntimeConfig,
  command: string,
  targetDeviceIds?: string[],
  requireExplicitTarget = false
) {
  const devices = await getBackendDevices(config);
  if (targetDeviceIds && targetDeviceIds.length > 0) {
    const selected = devices.filter((device) => targetDeviceIds.includes(device.id));
    if (selected.length > 0) return selected;
  }

  const resolution = resolveTargetsFromDevices(devices, command);
  if (resolution.status === "matched") {
    const matchedIds = new Set(resolution.devices.map((device) => device.id));
    return devices.filter((device) => matchedIds.has(device.id));
  }
  if (requireExplicitTarget) {
    throw new ApiError("NOT_FOUND", "语音指令需要先明确目标设备。");
  }

  for (const device of devices) {
    const test = await safeTestDevice(config, device.id);
    if (test?.ok) return [device];
  }

  return [devices[0]];
}

export const backendApi = {
  async resolveCommandTargets(config: ApiRuntimeConfig, text: string): Promise<TargetResolution> {
    const devices = await getBackendDevices(config);
    return resolveTargetsFromDevices(devices, text);
  },

  async getDevices(config: ApiRuntimeConfig): Promise<DeviceListResponse> {
    const response = await requestJson<BackendDevice[]>(config, "/devices");
    const devices = await Promise.all(
      response.map(async (item) => {
        const test = await safeTestDevice(config, item.id);
        return mapDevice(item, test);
      })
    );

    return {
      devices,
      stats: {
        total: devices.length,
        online: devices.filter((item) => item.status === "online").length,
        offline: devices.filter((item) => item.status === "offline").length,
        warning: devices.filter((item) => item.status === "warning").length
      }
    };
  },

  async getDevice(config: ApiRuntimeConfig, id: string): Promise<Device | null> {
    try {
      const response = await requestJson<BackendDevice>(config, `/devices/${id}`);
      const test = await safeTestDevice(config, id);
      return mapDevice(response, test);
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },

  async getCommandDashboard(config: ApiRuntimeConfig): Promise<CommandDashboardResponse> {
    const [response, devices] = await Promise.all([
      requestJson<BackendCommand[]>(config, "/commands"),
      requestJson<BackendDevice[]>(config, "/devices").catch(() => [])
    ]);
    const deviceNameById = Object.fromEntries(devices.map((device) => [device.id, device.name]));

    return {
      stages: commandStages,
      logs: commandLogs,
      history: response.map((command) => mapCommand(command, deviceNameById))
    };
  },

  async getCommand(config: ApiRuntimeConfig, id: string): Promise<CommandHistory | null> {
    try {
      const [response, devices] = await Promise.all([
        requestJson<BackendCommand>(config, `/commands/${id}`),
        requestJson<BackendDevice[]>(config, "/devices").catch(() => [])
      ]);
      const deviceNameById = Object.fromEntries(devices.map((device) => [device.id, device.name]));
      return mapCommand(response, deviceNameById);
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_FOUND") return null;
      throw error;
    }
  },

  async getDeviceLogs(config: ApiRuntimeConfig, id: string): Promise<CommandLog[]> {
    const response = await requestJson<BackendDeviceLog[]>(config, `/devices/${id}/logs`);
    return response.map(mapDeviceLog);
  },

  async addManualDevice(config: ApiRuntimeConfig, payload: AddManualDeviceRequest): Promise<AddManualDeviceResponse> {
    const device = await requestJson<BackendDevice>(config, "/devices", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name || `局域网设备 ${payload.host}`,
        host: payload.host,
        port: payload.port,
        pairing_token: payload.pairingToken,
        system: payload.system || "Unknown",
        type: payload.type || "computer",
        group_name: payload.groupName || "局域网",
        note: payload.note || "手动添加的局域网设备"
      })
    });

    const test = await testDevice(config, device.id);

    return {
      device: mapDevice(device, test),
      test
    };
  },

  async updateDevice(config: ApiRuntimeConfig, payload: UpdateDeviceRequest): Promise<UpdateDeviceResponse> {
    const body: Record<string, unknown> = {
      name: payload.name,
      host: payload.host,
      port: payload.port,
      group_name: payload.groupName,
      note: payload.note
    };
    if (payload.pairingToken?.trim()) {
      body.pairing_token = payload.pairingToken.trim();
    }

    const device = await requestJson<BackendDevice>(config, `/devices/${payload.deviceId}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
    const test = await testDevice(config, device.id);
    return {
      device: mapDevice(device, test),
      test
    };
  },

  async runQuickAction(config: ApiRuntimeConfig, request: DeviceQuickActionRequest): Promise<DeviceQuickActionResponse> {
    if (request.action === "test") {
      const result = await testDevice(config, request.deviceId);
      return {
        ok: result.ok,
        message: result.ok ? "连接测试成功，Agent 在线。" : `连接测试失败：${result.message}`
      };
    }

    if (request.action === "open-url") {
      const result = await requestJson<ActionResult>(config, `/devices/${request.deviceId}/actions/open-url`, {
        method: "POST",
        body: JSON.stringify({ url: "https://www.baidu.com" })
      });

      return {
        ok: result.ok,
        message: result.message || "已发送打开浏览器指令。"
      };
    }

    const result = await requestJson<ActionResult>(config, `/devices/${request.deviceId}/actions/open-app`, {
      method: "POST",
      body: JSON.stringify({ app: "notepad" })
    });

    return {
      ok: result.ok,
      message: result.message || "已发送打开应用指令。"
    };
  },

  async runTextCommand(config: ApiRuntimeConfig, request: TextCommandRequest): Promise<TextCommandResponse> {
    const command = request.text.trim();
    if (!command) {
      throw new ApiError("UNKNOWN", "请输入指令内容。");
    }

    const logs: TextCommandResponse["logs"] = [
      { level: "info", message: `接收指令：${command}` },
      { level: "success", message: "使用本地规则解析意图，未调用 AI 模型。" }
    ];
    const targets = await resolveTargetDevices(
      config,
      command,
      request.targetDeviceIds,
      request.requireExplicitTarget
    );
    const targetNames = targets.map((target) => target.name).join("、");
    logs.push({
      level: "success",
      message: request.targetDeviceIds && request.targetDeviceIds.length > 0 ? `使用已选择设备：${targetNames}` : `匹配目标设备：${targetNames}`
    });

    const normalized = command.toLowerCase();
    if (command.includes("测试") || command.includes("状态") || command.includes("连接")) {
      const results = await Promise.all(targets.map((target) => testDevice(config, target.id).then((result) => ({ target, result }))));
      await Promise.all(
        results.map(({ target, result }) =>
          recordCommand(config, {
            deviceId: target.id,
            action: "test-connection",
            originalCommand: command,
            source: request.source || "text",
            status: result.ok ? "success" : "failed",
            result: result.message
          })
        )
      );
      results.forEach(({ target, result }) => {
        logs.push({ level: result.ok ? "success" : "error", message: `${target.name}：${result.message}` });
      });
      const ok = results.every(({ result }) => result.ok);
      return {
        ok,
        message: ok ? "所选设备在线，连接测试成功。" : "部分设备连接测试失败。",
        targetDeviceIds: targets.map((target) => target.id),
        targetDeviceName: targetNames,
        logs
      };
    }

    if (command.includes("浏览器") || command.includes("网址") || normalized.includes("url") || normalized.includes("browser")) {
      const url = extractUrl(command);
      logs.push({ level: "info", message: `准备打开 URL：${url}` });
      const results = await Promise.all(
        targets.map((target) =>
          requestJson<ActionResult>(config, `/devices/${target.id}/actions/open-url`, {
            method: "POST",
            body: JSON.stringify({ url, source: request.source || "text", original_command: command })
          }).then((result) => ({ target, result }))
        )
      );
      results.forEach(({ target, result }) => {
        logs.push({ level: result.ok ? "success" : "error", message: `${target.name}：${result.message}` });
      });
      const ok = results.every(({ result }) => result.ok);
      return {
        ok,
        message: ok ? "打开浏览器指令已发送。" : "部分设备执行失败。",
        targetDeviceIds: targets.map((target) => target.id),
        targetDeviceName: targetNames,
        commandIds: results.map(({ result }) => result.command_id).filter((id): id is string => Boolean(id)),
        logs
      };
    }

    if (
      command.includes("记事本") ||
      command.includes("计算器") ||
      command.includes("命令行") ||
      command.includes("资源管理器") ||
      normalized.includes("notepad") ||
      normalized.includes("calculator") ||
      normalized.includes("cmd") ||
      normalized.includes("explorer")
    ) {
      const app = resolveAppAlias(command);
      logs.push({ level: "info", message: `准备打开应用：${app}` });
      const results = await Promise.all(
        targets.map((target) =>
          requestJson<ActionResult>(config, `/devices/${target.id}/actions/open-app`, {
            method: "POST",
            body: JSON.stringify({ app, source: request.source || "text", original_command: command })
          }).then((result) => ({ target, result }))
        )
      );
      results.forEach(({ target, result }) => {
        logs.push({ level: result.ok ? "success" : "error", message: `${target.name}：${result.message}` });
      });
      const ok = results.every(({ result }) => result.ok);
      return {
        ok,
        message: ok ? "打开应用指令已发送。" : "部分设备执行失败。",
        targetDeviceIds: targets.map((target) => target.id),
        targetDeviceName: targetNames,
        commandIds: results.map(({ result }) => result.command_id).filter((id): id is string => Boolean(id)),
        logs
      };
    }

    logs.push({ level: "warning", message: "当前规则只支持：打开浏览器、打开记事本/计算器/cmd/资源管理器、测试连接。" });
    await Promise.all(
      targets.map((target) =>
        recordCommand(config, {
          deviceId: target.id,
          action: "unsupported",
          originalCommand: command,
          source: request.source || "text",
          status: "failed",
          result: "暂不支持这条指令。"
        })
      )
    );
    return {
      ok: false,
      message: "暂不支持这条指令。",
      targetDeviceIds: targets.map((target) => target.id),
      targetDeviceName: targetNames,
      logs
    };
  }
};
