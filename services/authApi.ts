import type { ApiRuntimeConfig } from "@/services/apiAdapter";
import { ApiError } from "@/services/apiTypes";

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  status: string;
};

type BackendUser = {
  id: string;
  username: string;
  display_name: string;
  status: string;
};

type BackendAuthResponse = {
  ok: boolean;
  user: BackendUser;
  session_id: string;
  message: string;
};

export type AuthResponse = {
  ok: boolean;
  user: AuthUser;
  sessionId: string;
  message: string;
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function mapAuthResponse(response: BackendAuthResponse): AuthResponse {
  return {
    ok: response.ok,
    user: mapUser(response.user),
    sessionId: response.session_id,
    message: response.message
  };
}

function mapUser(user: BackendUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    status: user.status
  };
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
        ...(config.sessionId ? { "X-Session-Id": config.sessionId } : {}),
        ...(init?.headers ?? {})
      }
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const code = response.status === 401 ? "UNAUTHORIZED" : "NETWORK_ERROR";
      throw new ApiError(code, data?.detail || data?.message || `请求失败：HTTP ${response.status}`);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "无法连接到 App 后端";
    throw new ApiError("NETWORK_ERROR", message === "Failed to fetch" ? "无法连接到 App 后端，请确认后端已启动" : message);
  } finally {
    clearTimeout(timer);
  }
}

export const authApi = {
  async getMe(config: ApiRuntimeConfig): Promise<AuthUser> {
    const response = await requestJson<BackendUser>(config, "/me");
    return mapUser(response);
  },

  async login(config: ApiRuntimeConfig, username: string, password: string): Promise<AuthResponse> {
    const response = await requestJson<BackendAuthResponse>(config, "/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
    return mapAuthResponse(response);
  },

  async register(config: ApiRuntimeConfig, username: string, password: string, displayName: string): Promise<AuthResponse> {
    const response = await requestJson<BackendAuthResponse>(config, "/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, display_name: displayName })
    });
    return mapAuthResponse(response);
  },

  async logout(config: ApiRuntimeConfig): Promise<void> {
    await requestJson<{ ok: boolean }>(config, "/auth/logout", {
      method: "POST",
      body: "{}"
    });
  }
};
