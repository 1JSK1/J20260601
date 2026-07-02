import type { ApiRuntimeConfig } from "@/services/apiAdapter";
import { ApiError } from "@/services/apiTypes";

export type TencentAsrConfig = {
  appId: string;
  secretId: string;
  secretKeyConfigured: boolean;
  engine: "16k_zh";
  enabled: boolean;
  configured: boolean;
  updatedAt: string;
};

export type TencentAsrConfigUpdate = {
  appId: string;
  secretId: string;
  secretKey: string;
  engine: "16k_zh";
  enabled: boolean;
};

export type TencentAsrSession = {
  url: string;
  voiceId: string;
  expiresAt: number;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  frameBytes: number;
};

type BackendConfig = {
  app_id: string;
  secret_id: string;
  secret_key_configured: boolean;
  engine: "16k_zh";
  enabled: boolean;
  configured: boolean;
  updated_at: string;
};

type BackendSession = {
  url: string;
  voice_id: string;
  expires_at: number;
  sample_rate: number;
  channels: number;
  bits_per_sample: number;
  frame_bytes: number;
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

function mapConfig(value: BackendConfig): TencentAsrConfig {
  return {
    appId: value.app_id,
    secretId: value.secret_id,
    secretKeyConfigured: value.secret_key_configured,
    engine: value.engine,
    enabled: value.enabled,
    configured: value.configured,
    updatedAt: value.updated_at
  };
}

export const tencentSpeechApi = {
  async getConfig(config: ApiRuntimeConfig): Promise<TencentAsrConfig> {
    return mapConfig(await requestJson<BackendConfig>(config, "/speech/tencent/config"));
  },

  async updateConfig(config: ApiRuntimeConfig, value: TencentAsrConfigUpdate): Promise<TencentAsrConfig> {
    return mapConfig(
      await requestJson<BackendConfig>(config, "/speech/tencent/config", {
        method: "PUT",
        body: JSON.stringify({
          app_id: value.appId,
          secret_id: value.secretId,
          secret_key: value.secretKey,
          engine: value.engine,
          enabled: value.enabled
        })
      })
    );
  },

  async createSession(config: ApiRuntimeConfig): Promise<TencentAsrSession> {
    const value = await requestJson<BackendSession>(config, "/speech/tencent/session", {
      method: "POST",
      body: "{}"
    });
    return {
      url: value.url,
      voiceId: value.voice_id,
      expiresAt: value.expires_at,
      sampleRate: value.sample_rate,
      channels: value.channels,
      bitsPerSample: value.bits_per_sample,
      frameBytes: value.frame_bytes
    };
  }
};
