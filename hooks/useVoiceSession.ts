import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as Speech from "expo-speech";
import {
  backendApi,
  TargetDeviceMatch,
  TargetResolution
} from "@/services/backendApi";
import { CloudSpeechRecognition } from "@/services/cloudSpeechRecognition";
import { queryKeys } from "@/services/queryKeys";
import { useAppStore } from "@/store/useAppStore";

export type VoiceSessionState =
  | "requesting-permission"
  | "listening-command"
  | "resolving-target"
  | "waiting-target"
  | "confirming-risk"
  | "executing"
  | "speaking"
  | "error"
  | "stopped";

const TARGET_TIMEOUT_MS = 2 * 60 * 1000;
const CANCEL_WORDS = ["取消", "算了", "停止", "不用了"];
const CONFIRM_WORDS = ["确认执行", "确认", "执行吧", "继续执行"];
const RISK_WORDS = ["删除", "解绑", "重启", "关机", "全部", "所有", "批量"];

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function isRiskCommand(text: string, targets: TargetDeviceMatch[]) {
  return includesAny(text, RISK_WORDS) || targets.length > 1;
}

function targetNames(targets: TargetDeviceMatch[]) {
  return targets.map((target) => target.name).join("、");
}

async function speakOnce(message: string) {
  await Speech.stop();
  await new Promise<void>((resolve) => {
    Speech.speak(message, {
      language: "zh-CN",
      rate: 0.95,
      onDone: resolve,
      onStopped: resolve,
      onError: () => resolve()
    });
  });
}

function resolutionPrompt(resolution: TargetResolution) {
  if (resolution.status === "ambiguous") {
    return `找到多个设备：${targetNames(resolution.devices)}。请说明要操作哪个设备。`;
  }
  if (resolution.status === "not_found") {
    return "没有找到该设备，请重新说明设备名称。";
  }
  return "请问要对哪个设备进行操作？";
}

export function useVoiceSession() {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);
  const setLastActionMessage = useAppStore((state) => state.setLastActionMessage);
  const [state, setState] = useState<VoiceSessionState>("requesting-permission");
  const [transcript, setTranscript] = useState("");
  const [pendingCommand, setPendingCommand] = useState("");
  const [candidates, setCandidates] = useState<TargetDeviceMatch[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<TargetDeviceMatch[]>([]);
  const [lastResult, setLastResult] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const activeRef = useRef(true);
  const stateRef = useRef<VoiceSessionState>("requesting-permission");
  const pendingCommandRef = useRef("");
  const candidatesRef = useRef<TargetDeviceMatch[]>([]);
  const selectedTargetsRef = useRef<TargetDeviceMatch[]>([]);
  const lastFinalRef = useRef({ text: "", at: 0 });
  const finalTranscriptHandlerRef = useRef<(value: string) => Promise<void>>(async () => undefined);
  const recognitionRef = useRef<CloudSpeechRecognition | null>(null);
  const listeningStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSessionState = useCallback((next: VoiceSessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const stopRecognition = useCallback(() => {
    if (listeningStartTimerRef.current) {
      clearTimeout(listeningStartTimerRef.current);
      listeningStartTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) void recognition.stop();
  }, []);

  const startListening = useCallback(
    (nextState: "listening-command" | "waiting-target" | "confirming-risk") => {
      if (!activeRef.current) return;
      if (listeningStartTimerRef.current) clearTimeout(listeningStartTimerRef.current);
      stopRecognition();
      setSessionState(nextState);
      setErrorMessage("");
      setTranscript("");
      listeningStartTimerRef.current = setTimeout(() => {
        if (!activeRef.current || stateRef.current !== nextState) return;
        const recognition = new CloudSpeechRecognition(apiConfig, {
          onInterim: setTranscript,
          onFinal: (value) => {
            if (recognitionRef.current !== recognition) return;
            recognitionRef.current = null;
            void recognition.stop().then(() => finalTranscriptHandlerRef.current(value));
          },
          onError: (message) => {
            if (recognitionRef.current !== recognition) return;
            recognitionRef.current = null;
            setErrorMessage(message);
            setSessionState("error");
          }
        });
        recognitionRef.current = recognition;
        void recognition.start().catch((error) => {
          if (recognitionRef.current !== recognition) return;
          recognitionRef.current = null;
          setErrorMessage(error instanceof Error ? error.message : "无法启动腾讯云语音识别");
          setSessionState("error");
        });
      }, 300);
    },
    [apiConfig, setSessionState, stopRecognition]
  );

  const speakThen = useCallback(
    async (
      message: string,
      nextState: "listening-command" | "waiting-target" | "confirming-risk" | "stopped"
    ) => {
      setSessionState("speaking");
      stopRecognition();
      await Speech.stop();
      if (!activeRef.current && nextState !== "stopped") return;
      Speech.speak(message, {
        language: "zh-CN",
        rate: 0.95,
        onDone: () => {
          if (nextState === "stopped") {
            setSessionState("stopped");
            return;
          }
          startListening(nextState);
        },
        onStopped: () => {
          if (activeRef.current && nextState !== "stopped") startListening(nextState);
        },
        onError: () => {
          if (activeRef.current && nextState !== "stopped") startListening(nextState);
        }
      });
    },
    [setSessionState, startListening, stopRecognition]
  );

  const resetPendingCommand = useCallback(() => {
    pendingCommandRef.current = "";
    candidatesRef.current = [];
    selectedTargetsRef.current = [];
    setPendingCommand("");
    setCandidates([]);
    setSelectedTargets([]);
  }, []);

  const executeCommand = useCallback(
    async (command: string, targets: TargetDeviceMatch[], confirmed = false) => {
      if (isRiskCommand(command, targets) && !confirmed) {
        selectedTargetsRef.current = targets;
        setSelectedTargets(targets);
        setSessionState("confirming-risk");
        await speakThen(
          `即将对${targetNames(targets)}执行高风险操作。请说确认执行，或说取消。`,
          "confirming-risk"
        );
        return;
      }

      stopRecognition();
      setSessionState("executing");
      await speakOnce(`正在对${targetNames(targets)}执行。`);

      try {
        const response = await backendApi.runTextCommand(apiConfig, {
          text: command,
          targetDeviceIds: targets.map((target) => target.id),
          requireExplicitTarget: true,
          source: "voice"
        });
        const summary = response.targetDeviceName
          ? `${response.targetDeviceName}，${response.message}`
          : response.message;
        const resultMessage = `${response.ok ? "执行成功" : "执行失败"}，${summary}`;
        setLastResult(resultMessage);
        setLastActionMessage(summary);
        resetPendingCommand();
        await queryClient.invalidateQueries({ queryKey: queryKeys.commandDashboard });
        await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
        await speakThen(resultMessage, "listening-command");
      } catch (error) {
        const message = error instanceof Error ? error.message : "执行指令失败。";
        const resultMessage = `执行失败，${message}`;
        setLastResult(resultMessage);
        setLastActionMessage(message);
        resetPendingCommand();
        await speakThen(resultMessage, "listening-command");
      }
    },
    [
      apiConfig,
      queryClient,
      resetPendingCommand,
      setLastActionMessage,
      setSessionState,
      speakThen,
      stopRecognition
    ]
  );

  const handleResolution = useCallback(
    async (resolution: TargetResolution, command: string) => {
      if (resolution.status === "matched") {
        candidatesRef.current = resolution.devices;
        setCandidates(resolution.devices);
        await executeCommand(command, resolution.devices);
        return;
      }

      const nextCandidates = resolution.status === "ambiguous" ? resolution.devices : [];
      candidatesRef.current = nextCandidates;
      setCandidates(nextCandidates);
      setSessionState("waiting-target");
      await speakThen(resolutionPrompt(resolution), "waiting-target");
    },
    [executeCommand, setSessionState, speakThen]
  );

  const resolveInitialCommand = useCallback(
    async (command: string) => {
      pendingCommandRef.current = command;
      setPendingCommand(command);
      setSessionState("resolving-target");
      stopRecognition();
      try {
        const resolution = await backendApi.resolveCommandTargets(apiConfig, command);
        await handleResolution(resolution, command);
      } catch (error) {
        const message = error instanceof Error ? error.message : "无法解析目标设备。";
        setLastResult(message);
        resetPendingCommand();
        await speakThen(message, "listening-command");
      }
    },
    [apiConfig, handleResolution, resetPendingCommand, setSessionState, speakThen, stopRecognition]
  );

  const resolveTargetAnswer = useCallback(
    async (answer: string) => {
      if (includesAny(answer, CANCEL_WORDS)) {
        resetPendingCommand();
        await speakThen("已取消本轮指令。", "listening-command");
        return;
      }
      try {
        setSessionState("resolving-target");
        stopRecognition();
        const resolution = await backendApi.resolveCommandTargets(apiConfig, answer);
        await handleResolution(resolution, pendingCommandRef.current);
      } catch (error) {
        const message = error instanceof Error ? error.message : "无法识别目标设备。";
        await speakThen(message, "waiting-target");
      }
    },
    [apiConfig, handleResolution, resetPendingCommand, setSessionState, speakThen, stopRecognition]
  );

  const handleConfirmation = useCallback(
    async (answer: string) => {
      if (includesAny(answer, CANCEL_WORDS)) {
        resetPendingCommand();
        await speakThen("已取消高风险指令。", "listening-command");
        return;
      }
      if (includesAny(answer, CONFIRM_WORDS)) {
        await executeCommand(pendingCommandRef.current, selectedTargetsRef.current, true);
        return;
      }
      await speakThen("请说确认执行，或说取消。", "confirming-risk");
    },
    [executeCommand, resetPendingCommand, speakThen]
  );

  const handleFinalTranscript = useCallback(
    async (value: string) => {
      const finalText = value.trim();
      const now = Date.now();
      if (!finalText || (finalText === lastFinalRef.current.text && now - lastFinalRef.current.at < 2000)) return;
      lastFinalRef.current = { text: finalText, at: now };
      setTranscript(finalText);

      if (stateRef.current === "waiting-target") {
        await resolveTargetAnswer(finalText);
      } else if (stateRef.current === "confirming-risk") {
        await handleConfirmation(finalText);
      } else if (stateRef.current === "listening-command") {
        await resolveInitialCommand(finalText);
      }
    },
    [handleConfirmation, resolveInitialCommand, resolveTargetAnswer]
  );

  useEffect(() => {
    finalTranscriptHandlerRef.current = handleFinalTranscript;
  }, [handleFinalTranscript]);

  const startSession = useCallback(async () => {
    activeRef.current = true;
    setSessionState("requesting-permission");
    setErrorMessage("");
    try {
      if (!apiConfig.sessionId) throw new Error("请先登录账号并配置腾讯云实时语音识别");
      startListening(pendingCommandRef.current ? "waiting-target" : "listening-command");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "无法启动语音模式。");
      setSessionState("error");
    }
  }, [apiConfig.sessionId, setSessionState, startListening]);

  const stopSession = useCallback(async () => {
    activeRef.current = false;
    stopRecognition();
    await Speech.stop();
    setSessionState("stopped");
  }, [setSessionState, stopRecognition]);

  const cancelPending = useCallback(async () => {
    resetPendingCommand();
    await speakThen("已取消本轮指令。", "listening-command");
  }, [resetPendingCommand, speakThen]);

  const selectCandidate = useCallback(
    async (device: TargetDeviceMatch) => {
      candidatesRef.current = [device];
      setCandidates([device]);
      await executeCommand(pendingCommandRef.current, [device]);
    },
    [executeCommand]
  );

  const confirmRisk = useCallback(async () => {
    await executeCommand(pendingCommandRef.current, selectedTargetsRef.current, true);
  }, [executeCommand]);

  useEffect(() => {
    void startSession();
    return () => {
      activeRef.current = false;
      stopRecognition();
      void Speech.stop();
    };
  }, [startSession, stopRecognition]);

  useEffect(() => {
    if (state !== "waiting-target") return;
    const timer = setTimeout(() => {
      resetPendingCommand();
      void speakThen("等待设备名称超时，已取消本轮指令。", "listening-command");
    }, TARGET_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [resetPendingCommand, speakThen, state]);

  return {
    state,
    transcript,
    pendingCommand,
    candidates,
    selectedTargets,
    lastResult,
    errorMessage,
    startSession,
    stopSession,
    cancelPending,
    selectCandidate,
    confirmRisk
  };
}
