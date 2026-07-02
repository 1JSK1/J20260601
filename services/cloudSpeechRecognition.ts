import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  type EmitterSubscription
} from "react-native";
import type { ApiRuntimeConfig } from "@/services/apiAdapter";
import { tencentSpeechApi } from "@/services/tencentSpeechApi";

type PcmRecorderNativeModule = {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

type TencentMessage = {
  code?: number;
  message?: string;
  result?: {
    slice_type?: number;
    voice_text_str?: string;
  };
};

export type CloudRecognitionCallbacks = {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
};

const pcmRecorder = NativeModules.PcmRecorder as PcmRecorderNativeModule | undefined;

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const decoded = globalThis.atob(value);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes.buffer;
}

function describeTencentError(code: number, message?: string) {
  if (code === 4002) {
    return "腾讯云鉴权失败（4002）：请确认 AppID、SecretId、SecretKey 属于同一个腾讯云账号，且密钥仍处于启用状态。";
  }
  return message || `腾讯云语音识别失败：${code}`;
}

export class CloudSpeechRecognition {
  private socket: WebSocket | null = null;
  private audioSubscription: EmitterSubscription | null = null;
  private errorSubscription: EmitterSubscription | null = null;
  private starting = false;
  private stopping = false;
  private recordingStarted = false;

  constructor(
    private readonly config: ApiRuntimeConfig,
    private readonly callbacks: CloudRecognitionCallbacks
  ) {}

  async start() {
    if (this.starting || this.socket) return;
    if (Platform.OS !== "android") throw new Error("腾讯云实时语音识别第一版仅支持 Android 真机");
    if (!pcmRecorder) throw new Error("当前 APK 未包含 PCM 录音模块，请重新安装最新 APK");

    this.starting = true;
    this.stopping = false;
    try {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
        title: "麦克风权限",
        message: "实时语音指令需要使用麦克风采集音频。",
        buttonPositive: "允许",
        buttonNegative: "拒绝"
      });
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error("麦克风权限未授权");
      }

      const session = await tencentSpeechApi.createSession(this.config);
      if (session.expiresAt <= Math.floor(Date.now() / 1000)) {
        throw new Error("腾讯云语音签名已经过期");
      }
      this.attachRecorderEvents(pcmRecorder);
      await this.openSocket(session.url);
    } finally {
      this.starting = false;
    }
  }

  async stop(sendEnd = true) {
    this.stopping = true;
    await this.stopRecorder();
    const socket = this.socket;
    if (socket && sendEnd && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "end" }));
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 600);
        const previousClose = socket.onclose;
        socket.onclose = (event) => {
          clearTimeout(timer);
          previousClose?.call(socket, event);
          resolve();
        };
      });
    }
    socket?.close();
    this.socket = null;
    this.removeRecorderEvents();
    this.stopping = false;
  }

  private openSocket(url: string) {
    return new Promise<void>((resolve, reject) => {
      let acknowledged = false;
      const socket = new WebSocket(url);
      this.socket = socket;
      const timeout = setTimeout(() => {
        if (acknowledged) return;
        socket.close();
        reject(new Error("连接腾讯云语音识别超时"));
      }, 10000);

      socket.onmessage = (event) => {
        let message: TencentMessage;
        try {
          message = JSON.parse(String(event.data)) as TencentMessage;
        } catch {
          this.fail("腾讯云返回了无法解析的数据");
          return;
        }
        if (typeof message.code === "number" && message.code !== 0) {
          const detail = describeTencentError(message.code, message.message);
          this.fail(detail);
          if (!acknowledged) {
            clearTimeout(timeout);
            reject(new Error(detail));
          }
          return;
        }

        if (!acknowledged) {
          acknowledged = true;
          clearTimeout(timeout);
          pcmRecorder!
            .start()
            .then(() => {
              this.recordingStarted = true;
              resolve();
            })
            .catch((error) => {
              const detail = error instanceof Error ? error.message : "无法启动麦克风录音";
              reject(new Error(detail));
              this.fail(detail);
            });
        }

        const text = message.result?.voice_text_str?.trim() ?? "";
        if (!text) return;
        this.callbacks.onInterim(text);
        if (message.result?.slice_type === 2) {
          this.callbacks.onFinal(text);
        }
      };
      socket.onerror = () => {
        const detail = "腾讯云语音 WebSocket 连接失败";
        if (!acknowledged) {
          clearTimeout(timeout);
          reject(new Error(detail));
        }
        this.fail(detail);
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        this.socket = null;
        void this.stopRecorder();
        if (!this.stopping && acknowledged) this.callbacks.onError("腾讯云语音连接已断开");
      };
    });
  }

  private attachRecorderEvents(module: PcmRecorderNativeModule) {
    const emitter = new NativeEventEmitter(module);
    this.audioSubscription = emitter.addListener("PcmRecorderFrame", (base64: string) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(base64ToArrayBuffer(base64));
      }
    });
    this.errorSubscription = emitter.addListener("PcmRecorderError", (message: string) => {
      this.fail(message || "麦克风录音失败");
    });
  }

  private removeRecorderEvents() {
    this.audioSubscription?.remove();
    this.errorSubscription?.remove();
    this.audioSubscription = null;
    this.errorSubscription = null;
  }

  private async stopRecorder() {
    if (!this.recordingStarted || !pcmRecorder) return;
    this.recordingStarted = false;
    try {
      await pcmRecorder.stop();
    } catch {
      // Recorder may already be stopped.
    }
  }

  private fail(message: string) {
    if (!this.stopping) this.callbacks.onError(message);
    void this.stop(false);
  }
}
