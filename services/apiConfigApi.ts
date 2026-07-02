import type { ApiRuntimeConfig } from "@/services/apiAdapter";
import { ApiError } from "@/services/apiTypes";

export type UserApiConfig = {
  backendBaseUrl: string;
  updatedAt: string;
};

type BackendApiConfig = {
  backend_base_url: string;
  updated_at: string;
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

async function requestJson<T>(config: ApiRuntimeConfig, path: string, init?: RequestInit): Promise<T> {
  if (!config.baseUrl) throw new ApiError("NETWORK_ERROR", "后端 Base URL 不能为空");
  if (!config.sessionId) throw new ApiError("UNAUTHORIZED", "请先登录账号");

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
      throw new ApiError(
        response.status === 401 ? "UNAUTHORIZED" : "NETWORK_ERROR",
        data?.detail || data?.message || `请求失败：HTTP ${response.status}`
      );
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "无法连接到 App 后端";
    throw new ApiError("NETWORK_ERROR", message === "Failed to fetch" ? "无法连接到 App 后端" : message);
  } finally {
    clearTimeout(timer);
  }
}

function mapConfig(value: BackendApiConfig): UserApiConfig {
  return {
    backendBaseUrl: value.backend_base_url,
    updatedAt: value.updated_at
  };
}

export const apiConfigApi = {
  async get(config: ApiRuntimeConfig): Promise<UserApiConfig> {
    return mapConfig(await requestJson<BackendApiConfig>(config, "/api-config"));
  },

  async update(config: ApiRuntimeConfig, backendBaseUrl: string): Promise<UserApiConfig> {
    return mapConfig(
      await requestJson<BackendApiConfig>(config, "/api-config", {
        method: "PUT",
        body: JSON.stringify({ backend_base_url: backendBaseUrl })
      })
    );
  }
};
