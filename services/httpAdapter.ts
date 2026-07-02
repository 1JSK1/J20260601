import {
  ApiError,
  CommandReplayResponse,
  ConnectionTestResponse,
  DeviceActionResponse
} from "./apiTypes";
import { ApiAdapter, ApiRuntimeConfig } from "./apiAdapter";

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function requestJson<T>(config: ApiRuntimeConfig, path: string, init?: RequestInit): Promise<T> {
  if (!config.baseUrl) {
    throw new ApiError("NETWORK_ERROR", "后端 Base URL 不能为空");
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
        ...(config.sessionId ? { "X-Session-Id": config.sessionId } : { "X-User-Id": config.userId }),
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
        ? `无法连接到 App 后端：请先运行 python backend\\run.py --host 127.0.0.1 --port 8008`
        : rawMessage || "无法连接到 App 后端";
    throw new ApiError("NETWORK_ERROR", message);
  } finally {
    clearTimeout(timer);
  }
}

export const httpAdapter: ApiAdapter = {
  async runDeviceAction(request, config): Promise<DeviceActionResponse> {
    if (request.action === "refresh") {
      const response = await requestJson<{ ok: boolean; message: string }>(config, `/devices/${request.deviceId}/test`, {
        method: "POST",
        body: "{}"
      });

      return {
        requestId: `req-${Date.now()}`,
        status: "completed",
        message: response.ok ? "设备连接测试成功" : `设备连接测试失败：${response.message}`
      };
    }

    if (request.action === "delete") {
      await requestJson<{ ok: boolean }>(config, `/devices/${request.deviceId}`, {
        method: "DELETE"
      });

      return {
        requestId: `req-${Date.now()}`,
        status: "completed",
        message: "设备已从后端删除"
      };
    }

    return {
      requestId: `req-${Date.now()}`,
      status: "completed",
      message: `${request.action} 需要设备端高风险动作接口，当前后端尚未开放。`
    };
  },

  async replayCommand(): Promise<CommandReplayResponse> {
    return {
      requestId: `req-${Date.now()}`,
      status: "queued",
      message: "重执行接口尚未接入，当前只读取后端命令历史。"
    };
  },

  async testConnection(request, config): Promise<ConnectionTestResponse> {
    const startedAt = Date.now();
    const baseUrl = request.baseUrl || config.baseUrl;

    if (!baseUrl) {
      throw new ApiError("NETWORK_ERROR", "Base URL 不能为空");
    }

    const response = await requestJson<{ ok: boolean; service: string; version: string }>(
      { ...config, baseUrl },
      "/health"
    );

    return {
      ok: response.ok,
      latencyMs: Date.now() - startedAt,
      message: `${response.service} ${response.version} 可用`
    };
  }
};
