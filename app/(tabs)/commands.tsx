import * as Dialog from "@rn-primitives/dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { LucideIcon } from "@/components/Icon";
import { InlineState } from "@/components/InlineState";
import { PageContainer } from "@/components/PageContainer";
import { SectionCard } from "@/components/SectionCard";
import type { CommandHistory, CommandStage, Device, StageStatus } from "@/data/types";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useCommandDashboardQuery, useSendTextCommandMutation } from "@/hooks/useCommands";
import { useDevicesQuery } from "@/hooks/useDevices";
import { useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

type CommandMode = "text" | "voice";
type RunState = "idle" | "running" | "success" | "error";

type CurrentExecution = {
  command: string;
  source: "文本" | "语音";
  targetNames: string[];
  status: string;
  completed: number;
  total: number;
};

const stageIcon: Record<StageStatus, string> = {
  done: "Check",
  active: "Activity",
  waiting: "Clock",
  error: "AlertTriangle"
};

function buildStages(state: RunState): CommandStage[] {
  const labels = [
    ["receive", "接收"],
    ["parse", "解析"],
    ["match", "匹配"],
    ["execute", "执行"],
    ["result", "结果"]
  ] as const;

  if (state === "success") return labels.map(([key, label]) => ({ key, label, status: "done" }));
  if (state === "error") {
    return labels.map(([key, label], index) => ({
      key,
      label,
      status: index < 3 ? "done" : index === 3 ? "error" : "waiting"
    }));
  }
  if (state === "running") {
    return labels.map(([key, label], index) => ({
      key,
      label,
      status: index < 3 ? "done" : index === 3 ? "active" : "waiting"
    }));
  }
  return labels.map(([key, label]) => ({ key, label, status: "waiting" }));
}

export default function CommandsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const commandDashboardQuery = useCommandDashboardQuery();
  const devicesQuery = useDevicesQuery();
  const sendTextCommandMutation = useSendTextCommandMutation();
  const text = useAppStore((state) => state.commandDraft);
  const authUser = useAppStore((state) => state.authUser);
  const setText = useAppStore((state) => state.setCommandDraft);
  const targetDeviceIds = useAppStore((state) => state.commandTargetDeviceIds);
  const setTargetDeviceIds = useAppStore((state) => state.setCommandTargetDeviceIds);
  const setLastActionMessage = useAppStore((state) => state.setLastActionMessage);
  const [mode, setMode] = useState<CommandMode>("text");
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [currentExecution, setCurrentExecution] = useState<CurrentExecution | null>(null);
  const [inputHeight, setInputHeight] = useState(48);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const composerFocusedRef = useRef(false);

  const commandHistory = commandDashboardQuery.data?.history ?? [];
  const devices = devicesQuery.data?.devices ?? [];
  const selectedDevices = devices.filter((device) => targetDeviceIds.includes(device.id));
  const stages = useMemo(() => buildStages(runState), [runState]);
  const visibleHistory = commandHistory.slice(0, 4);
  const busy = sendTextCommandMutation.isPending || runState === "running";

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      const windowHeight = Dimensions.get("window").height;
      const overlap = Math.max(0, windowHeight - event.endCoordinates.screenY);
      setKeyboardInset(Platform.OS === "android" ? overlap : 0);
      if (composerFocusedRef.current) {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
      }
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function toggleTarget(deviceId: string) {
    setTargetDeviceIds(
      targetDeviceIds.includes(deviceId)
        ? targetDeviceIds.filter((id) => id !== deviceId)
        : [...targetDeviceIds, deviceId]
    );
  }

  function revealCommandComposer() {
    composerFocusedRef.current = true;
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function handleSend() {
    const command = text.trim();
    if (!command || selectedDevices.length === 0 || busy) return;

    const execution: CurrentExecution = {
      command,
      source: "文本",
      targetNames: selectedDevices.map((device) => device.name),
      status: "执行中",
      completed: 0,
      total: selectedDevices.length
    };
    setCurrentExecution(execution);
    setRunState("running");

    sendTextCommandMutation.mutate(
      { text: command, targetDeviceIds, requireExplicitTarget: true, source: "text" },
      {
        onSuccess: (response) => {
          setRunState(response.ok ? "success" : "error");
          setCurrentExecution({
            ...execution,
            status: response.ok ? "全部成功" : "部分或全部失败",
            completed: response.ok ? execution.total : 0
          });
          setLastActionMessage(response.message);
          if (response.ok) {
            setText("");
            setInputHeight(48);
          }
        },
        onError: (error) => {
          setRunState("error");
          setCurrentExecution({ ...execution, status: "执行失败", completed: 0 });
          setLastActionMessage(error.message);
        }
      }
    );
  }

  if (!authUser) {
    return (
      <PageContainer>
        <View className="flex-1 justify-center">
          <InlineState title="请先登录账号" description="登录后才能读取设备、执行指令和查看执行记录。" />
          <View className="mt-4">
            <Pressable
              onPress={() => router.push("/settings/account")}
              className="items-center rounded-2xl py-4 active:opacity-80"
              style={{ backgroundColor: palette.primary }}
            >
              <Text className="font-semibold" style={{ color: palette.primaryText }}>前往登录</Text>
            </Pressable>
          </View>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          contentContainerStyle={{
            paddingBottom: mode === "text" ? keyboardInset + 24 : 24
          }}
        >
          <ModeSwitch
            value={mode}
            disabled={busy}
            onChange={(nextMode) => {
              setMode(nextMode);
              if (nextMode === "voice") setTargetDialogOpen(false);
            }}
          />

          {mode === "text" ? (
            <TextModeWorkspace
              devices={devices}
              selectedDevices={selectedDevices}
              errorMessage={devicesQuery.isError ? devicesQuery.error.message : undefined}
              onOpenTargets={() => setTargetDialogOpen(true)}
            />
          ) : (
            <VoiceModeWorkspace
              onExecutionChange={setCurrentExecution}
              onRunStateChange={setRunState}
            />
          )}

          <View className="mt-3">
            <CurrentExecutionCard execution={currentExecution} />
          </View>

          <View className="mt-3">
            <ExecutionStages stages={stages} />
          </View>

          <View className="mt-3">
            <ExecutionHistory
              loading={commandDashboardQuery.isLoading}
              error={commandDashboardQuery.isError ? commandDashboardQuery.error.message : undefined}
              history={visibleHistory}
              onViewAll={() => router.push("/commands/history")}
              onOpen={(id) => router.push(`/commands/${id}`)}
            />
          </View>

          {mode === "text" ? (
            <View
              className="mt-3 border-t pt-3"
              style={{
                backgroundColor: palette.background,
                borderColor: palette.line
              }}
            >
              <CommandComposer
                value={text}
                height={inputHeight}
                disabled={busy}
                canSend={Boolean(text.trim()) && selectedDevices.length > 0 && !busy}
                missingTarget={selectedDevices.length === 0}
                onChangeText={setText}
                onFocus={revealCommandComposer}
                onHeightChange={setInputHeight}
                onSend={handleSend}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <TargetDeviceDialog
        open={targetDialogOpen}
        devices={devices}
        selectedIds={targetDeviceIds}
        onToggle={toggleTarget}
        onSelectAll={() => setTargetDeviceIds(devices.map((device) => device.id))}
        onClear={() => setTargetDeviceIds([])}
        onOpenChange={setTargetDialogOpen}
      />
    </PageContainer>
  );
}

function ModeSwitch({
  value,
  disabled,
  onChange
}: {
  value: CommandMode;
  disabled: boolean;
  onChange: (value: CommandMode) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-3 mt-2 flex-row rounded-full p-1" style={{ backgroundColor: palette.surface }}>
      {(["text", "voice"] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            disabled={disabled}
            onPress={() => onChange(mode)}
            className={`flex-1 rounded-full py-3 ${disabled ? "opacity-60" : "active:opacity-80"}`}
            style={{ backgroundColor: active ? palette.primary : "transparent" }}
          >
            <Text className="text-center text-sm font-semibold" style={{ color: active ? palette.primaryText : palette.textMuted }}>
              {mode === "text" ? "指令模式" : "语音模式"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TextModeWorkspace({
  devices,
  selectedDevices,
  errorMessage,
  onOpenTargets
}: {
  devices: Device[];
  selectedDevices: Device[];
  errorMessage?: string;
  onOpenTargets: () => void;
}) {
  const { palette } = useAppTheme();
  const summary =
    selectedDevices.length === 0
      ? "请选择目标设备"
      : selectedDevices.length <= 2
        ? selectedDevices.map((device) => device.name).join("、")
        : `${selectedDevices.slice(0, 2).map((device) => device.name).join("、")}等 ${selectedDevices.length} 台`;

  return (
    <SectionCard>
      <Pressable onPress={onOpenTargets} className="flex-row items-center active:opacity-80">
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${palette.primary}18` }}>
          <LucideIcon name="MonitorCheck" color={palette.primary} size={21} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold" style={{ color: palette.text }}>
            {selectedDevices.length > 0 ? `已选择 ${selectedDevices.length} 台设备` : "选择目标设备"}
          </Text>
          <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: selectedDevices.length > 0 ? palette.textSoft : palette.warning }}>
            {summary}
          </Text>
        </View>
        <View className="rounded-full px-3 py-2" style={{ backgroundColor: `${palette.primary}18` }}>
          <Text className="text-xs font-semibold" style={{ color: palette.primary }}>
            {devices.length > 0 ? "选择设备" : "无设备"}
          </Text>
        </View>
      </Pressable>
      {errorMessage ? (
        <View className="mt-3">
          <InlineState title="设备列表不可用" description={errorMessage} />
        </View>
      ) : null}
    </SectionCard>
  );
}

function VoiceModeWorkspace({
  onExecutionChange,
  onRunStateChange
}: {
  onExecutionChange: (execution: CurrentExecution | null) => void;
  onRunStateChange: (state: RunState) => void;
}) {
  const { palette } = useAppTheme();
  const session = useVoiceSession();
  const listening = ["listening-command", "waiting-target", "confirming-risk"].includes(session.state);
  const statusLabel: Record<typeof session.state, string> = {
    "requesting-permission": "正在请求权限",
    "listening-command": "正在监听指令",
    "resolving-target": "正在解析设备",
    "waiting-target": "等待补充设备",
    "confirming-risk": "等待风险确认",
    executing: "正在执行",
    speaking: "正在播报",
    error: "语音模式异常",
    stopped: "语音模式已停止"
  };

  useEffect(() => {
    if (session.pendingCommand) {
      const targets =
        session.selectedTargets.length > 0
          ? session.selectedTargets
          : session.candidates;
      onExecutionChange({
        command: session.pendingCommand,
        source: "语音",
        targetNames: targets.map((target) => target.name),
        status: statusLabel[session.state],
        completed: 0,
        total: targets.length
      });
    }
    if (session.state === "executing") onRunStateChange("running");
    if (session.lastResult) {
      const success = session.lastResult.startsWith("执行成功");
      onRunStateChange(success ? "success" : "error");
    }
  }, [
    onExecutionChange,
    onRunStateChange,
    session.candidates,
    session.lastResult,
    session.pendingCommand,
    session.selectedTargets,
    session.state
  ]);

  return (
    <SectionCard>
      <View className="items-center py-2">
        <View
          className="h-24 w-24 items-center justify-center rounded-full border"
          style={{
            backgroundColor: listening ? `${palette.primary}30` : `${palette.primary}16`,
            borderColor: listening ? palette.primary : palette.line
          }}
        >
          <LucideIcon name={listening ? "Mic" : "MicOff"} color={palette.primary} size={36} />
        </View>
        <Text className="mt-4 text-lg font-bold" style={{ color: palette.text }}>
          {statusLabel[session.state]}
        </Text>
        <Text className="mt-2 min-h-12 text-center text-sm leading-6" style={{ color: session.transcript ? palette.text : palette.textMuted }}>
          {session.transcript || "等待语音输入"}
        </Text>
      </View>

      {session.candidates.length > 0 && session.state === "waiting-target" ? (
        <View className="mb-3 gap-2">
          {session.candidates.map((device) => (
            <Pressable
              key={device.id}
              onPress={() => session.selectCandidate(device)}
              className="rounded-2xl border p-3 active:opacity-80"
              style={{ backgroundColor: palette.elevated, borderColor: palette.line }}
            >
              <Text className="text-sm font-semibold" style={{ color: palette.text }}>{device.name}</Text>
              <Text className="mt-1 text-xs" style={{ color: palette.textMuted }}>{device.system} / {device.group}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {session.state === "confirming-risk" ? (
        <View className="mb-3 flex-row gap-3">
          <VoiceAction label="取消" onPress={session.cancelPending} />
          <VoiceAction label="确认执行" primary onPress={session.confirmRisk} />
        </View>
      ) : null}

      {session.errorMessage ? (
        <Text className="mb-3 text-center text-xs leading-5" style={{ color: palette.danger }}>{session.errorMessage}</Text>
      ) : null}

      <VoiceAction
        label={session.state === "stopped" || session.state === "error" ? "开始监听" : "停止监听"}
        primary={session.state === "stopped" || session.state === "error"}
        onPress={session.state === "stopped" || session.state === "error" ? session.startSession : session.stopSession}
      />
    </SectionCard>
  );
}

function VoiceAction({
  label,
  primary,
  onPress
}: {
  label: string;
  primary?: boolean;
  onPress: () => void | Promise<void>;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 rounded-full border px-4 py-3 active:opacity-80"
      style={{
        backgroundColor: primary ? palette.primary : palette.elevated,
        borderColor: primary ? palette.primary : palette.line
      }}
    >
      <Text className="text-center text-sm font-semibold" style={{ color: primary ? palette.primaryText : palette.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function CurrentExecutionCard({ execution }: { execution: CurrentExecution | null }) {
  const { palette } = useAppTheme();
  if (!execution) {
    return (
      <SectionCard title="当前执行">
        <Text className="text-sm" style={{ color: palette.textMuted }}>暂无正在执行的指令</Text>
      </SectionCard>
    );
  }

  const targetSummary =
    execution.targetNames.length === 0
      ? "等待匹配设备"
      : execution.targetNames.length <= 2
        ? execution.targetNames.join("、")
        : `${execution.targetNames.slice(0, 2).join("、")}等 ${execution.targetNames.length} 台`;

  return (
    <SectionCard title="当前执行">
      <View className="flex-row items-start">
        <View className="flex-1 pr-3">
          <Text className="text-base font-bold leading-6" style={{ color: palette.text }}>{execution.command}</Text>
          <Text className="mt-2 text-xs" style={{ color: palette.textMuted }}>{targetSummary}</Text>
        </View>
        <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: `${palette.primary}18` }}>
          <Text className="text-xs font-semibold" style={{ color: palette.primary }}>{execution.source}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t pt-3" style={{ borderColor: palette.line }}>
        <Text className="text-sm font-semibold" style={{ color: execution.status.includes("失败") ? palette.danger : palette.text }}>
          {execution.status}
        </Text>
        <Text className="text-xs" style={{ color: palette.textMuted }}>
          {execution.total > 0 ? `已完成 ${execution.completed}/${execution.total}` : "等待设备"}
        </Text>
      </View>
    </SectionCard>
  );
}

function ExecutionStages({ stages }: { stages: CommandStage[] }) {
  const { palette } = useAppTheme();
  return (
    <SectionCard title="执行阶段">
      <View className="flex-row items-start">
        {stages.map((stage, index) => {
          const color =
            stage.status === "done"
              ? palette.success
              : stage.status === "active"
                ? palette.primary
                : stage.status === "error"
                  ? palette.danger
                  : palette.textMuted;
          return (
            <View key={stage.key} className="flex-1 items-center">
              <View className="w-full flex-row items-center">
                <View className="h-0.5 flex-1" style={{ backgroundColor: index === 0 ? "transparent" : color }} />
                <View
                  className="h-9 w-9 items-center justify-center rounded-full border"
                  style={{ borderColor: color, backgroundColor: `${color}18` }}
                >
                  <LucideIcon name={stageIcon[stage.status]} size={16} color={color} />
                </View>
                <View className="h-0.5 flex-1" style={{ backgroundColor: index === stages.length - 1 ? "transparent" : color }} />
              </View>
              <Text className="mt-2 text-[11px] font-semibold" style={{ color }}>{stage.label}</Text>
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
}

function ExecutionHistory({
  loading,
  error,
  history,
  onViewAll,
  onOpen
}: {
  loading: boolean;
  error?: string;
  history: CommandHistory[];
  onViewAll: () => void;
  onOpen: (id: string) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <SectionCard>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold" style={{ color: palette.text }}>执行记录</Text>
        {!loading && !error && history.length > 0 ? (
          <Pressable onPress={onViewAll} className="px-2 py-1 active:opacity-70">
            <Text className="text-xs font-semibold" style={{ color: palette.primary }}>查看全部</Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? <InlineState title="正在加载" description="" /> : null}
      {error ? <InlineState title="记录加载失败" description={error} /> : null}
      {!loading && !error && history.length === 0 ? (
        <Text className="py-4 text-center text-sm" style={{ color: palette.textMuted }}>暂无执行记录</Text>
      ) : null}
      <View>
        {history.map((item, index) => (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            className={`flex-row items-center py-3 active:opacity-70 ${index > 0 ? "border-t" : ""}`}
            style={{ borderColor: palette.line }}
          >
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: palette.elevated }}>
              <LucideIcon name={item.result === "成功" ? "Check" : "CircleAlert"} color={item.result === "成功" ? palette.success : palette.danger} size={17} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="mr-2 text-xs" style={{ color: palette.textMuted }}>{item.time}</Text>
                <Text className="flex-1 text-sm font-semibold" numberOfLines={1} style={{ color: palette.text }}>{item.command}</Text>
              </View>
              <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: palette.textMuted }}>
                {item.target} · {item.source ?? "文本"} · {item.result}
              </Text>
            </View>
            <LucideIcon name="ChevronRight" color={palette.textMuted} size={18} />
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

function CommandComposer({
  value,
  height,
  disabled,
  canSend,
  missingTarget,
  onChangeText,
  onFocus,
  onHeightChange,
  onSend
}: {
  value: string;
  height: number;
  disabled: boolean;
  canSend: boolean;
  missingTarget: boolean;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onHeightChange: (height: number) => void;
  onSend: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View>
      <View
        className="flex-row items-end rounded-[24px] border p-2"
        style={{ backgroundColor: palette.panel, borderColor: missingTarget ? `${palette.warning}88` : palette.line }}
      >
        <TextInput
          editable={!disabled}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onContentSizeChange={(event) => onHeightChange(Math.max(48, Math.min(200, event.nativeEvent.contentSize.height + 16)))}
          placeholder={missingTarget ? "请先选择目标设备" : "请输入要执行的指令"}
          placeholderTextColor={palette.textMuted}
          multiline
          scrollEnabled={height >= 200}
          className="flex-1 px-3 py-3 text-[15px] leading-6"
          style={{ color: palette.text, height, textAlignVertical: "top" }}
        />
        <Pressable
          disabled={!canSend}
          onPress={onSend}
          className={`mb-0.5 h-11 w-11 items-center justify-center rounded-full ${canSend ? "active:opacity-80" : "opacity-40"}`}
          style={{ backgroundColor: palette.primary }}
        >
          <LucideIcon name={disabled ? "LoaderCircle" : "Send"} color={palette.primaryText} size={19} />
        </Pressable>
      </View>
    </View>
  );
}

function TargetDeviceDialog({
  open,
  devices,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  onOpenChange
}: {
  open: boolean;
  devices: Device[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="absolute inset-0 bg-black/60" />
        <Dialog.Content
          className="absolute bottom-0 left-0 right-0 max-h-[82%] rounded-t-[28px] border p-5"
          style={{ backgroundColor: palette.panel, borderColor: palette.line }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Dialog.Title className="text-xl font-bold" style={{ color: palette.text }}>选择目标设备</Dialog.Title>
            <Dialog.Close className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.surface }}>
              <LucideIcon name="X" color={palette.text} size={18} />
            </Dialog.Close>
          </View>
          <View className="mb-3 flex-row gap-3">
            <Pressable onPress={onSelectAll} className="flex-1 rounded-full border py-2.5 active:opacity-80" style={{ borderColor: palette.line }}>
              <Text className="text-center text-sm font-semibold" style={{ color: palette.text }}>全选</Text>
            </Pressable>
            <Pressable onPress={onClear} className="flex-1 rounded-full border py-2.5 active:opacity-80" style={{ borderColor: palette.line }}>
              <Text className="text-center text-sm font-semibold" style={{ color: palette.text }}>取消全选</Text>
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="gap-3">
              {devices.map((device) => (
                <Pressable
                  key={device.id}
                  onPress={() => onToggle(device.id)}
                  className="rounded-[20px] border p-4 active:opacity-80"
                  style={{
                    backgroundColor: selectedIds.includes(device.id) ? `${palette.primary}20` : palette.elevated,
                    borderColor: selectedIds.includes(device.id) ? palette.primary : palette.line
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="mr-3 h-7 w-7 items-center justify-center rounded-full border"
                      style={{
                        borderColor: selectedIds.includes(device.id) ? palette.primary : palette.line,
                        backgroundColor: selectedIds.includes(device.id) ? palette.primary : "transparent"
                      }}
                    >
                      {selectedIds.includes(device.id) ? <LucideIcon name="Check" color={palette.primaryText} size={16} /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold" style={{ color: palette.text }}>{device.name}</Text>
                      <Text className="mt-1 text-xs" style={{ color: palette.textMuted }}>{device.system} / {device.ip}</Text>
                    </View>
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: device.status === "online" ? palette.success : device.status === "offline" ? palette.textMuted : palette.warning }}
                    />
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Dialog.Close className="mt-4 rounded-full px-4 py-3.5" style={{ backgroundColor: palette.primary }}>
            <Text className="text-center text-sm font-semibold" style={{ color: palette.primaryText }}>
              完成（已选 {selectedIds.length} 台）
            </Text>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
