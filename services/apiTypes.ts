export type ApiErrorCode = "NETWORK_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "RISK_CONFIRM_REQUIRED" | "UNKNOWN";

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

export type DeviceRiskAction = "refresh" | "reboot" | "unbind" | "delete";

export type DeviceActionRequest = {
  deviceId: string;
  action: DeviceRiskAction;
  confirmed?: boolean;
};

export type DeviceActionResponse = {
  requestId: string;
  status: "queued" | "completed" | "requires_confirmation";
  message: string;
};

export type CommandReplayRequest = {
  commandId: string;
  confirmed?: boolean;
};

export type CommandReplayResponse = {
  requestId: string;
  status: "queued" | "requires_confirmation";
  message: string;
};

export type ConnectionTestRequest = {
  baseUrl: string;
  apiKey?: string;
  model?: string;
};

export type ConnectionTestResponse = {
  ok: boolean;
  latencyMs: number;
  message: string;
};
