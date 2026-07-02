import { ApiError } from "./apiTypes";
import { ApiAdapter } from "./apiAdapter";

const mutationLatency = 360;

function wait<T>(value: T, delay = mutationLatency): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

function requestId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

export const mockAdapter: ApiAdapter = {
  async runDeviceAction(request) {
    const highRisk = request.action === "reboot" || request.action === "unbind" || request.action === "delete";
    if (highRisk && !request.confirmed) {
      throw new ApiError("RISK_CONFIRM_REQUIRED", "该设备操作需要二次确认。");
    }

    const labelMap: Record<typeof request.action, string> = {
      refresh: "状态刷新已完成",
      reboot: "重启指令已进入队列",
      unbind: "解绑请求已进入队列",
      delete: "删除请求已进入队列"
    };

    return wait({
      requestId: requestId("dev"),
      status: request.action === "refresh" ? "completed" : "queued",
      message: labelMap[request.action]
    });
  },

  async replayCommand(request) {
    if (!request.confirmed) {
      throw new ApiError("RISK_CONFIRM_REQUIRED", "重新执行该指令前需要确认风险。");
    }

    return wait({
      requestId: requestId("cmd"),
      status: "queued",
      message: "指令已加入模拟执行队列。"
    });
  },

  async testConnection(request, config) {
    const baseUrl = request.baseUrl || config.baseUrl;
    const ok = Boolean(baseUrl);
    return wait({
      ok,
      latencyMs: ok ? 128 : 0,
      message: ok ? `Mock adapter 连接成功，当前模型 ${request.model || config.model}。` : "Base URL 不能为空。"
    });
  }
};
