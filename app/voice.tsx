import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useRouter } from "expo-router";
import { LucideIcon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
import { TargetDeviceMatch } from "@/services/backendApi";
import { VoiceSessionState, useVoiceSession } from "@/hooks/useVoiceSession";
import { useAppTheme } from "@/theme/AppTheme";

const stateCopy: Record<VoiceSessionState, { title: string; description: string; icon: string }> = {
  "requesting-permission": {
    title: "正在请求语音权限",
    description: "请允许麦克风和系统语音识别权限。",
    icon: "Shield"
  },
  "listening-command": {
    title: "正在监听指令",
    description: "请说出要执行的操作，并明确目标设备。",
    icon: "Mic"
  },
  "resolving-target": {
    title: "正在解析目标设备",
    description: "系统正在根据语音内容匹配设备。",
    icon: "Search"
  },
  "waiting-target": {
    title: "等待目标设备",
    description: "请说出具体设备名称，或点击下方候选设备。",
    icon: "Monitor"
  },
  "confirming-risk": {
    title: "等待高风险确认",
    description: "请说“确认执行”或“取消”，也可以使用下方按钮。",
    icon: "AlertTriangle"
  },
  executing: {
    title: "正在执行指令",
    description: "系统正在向目标设备发送操作。",
    icon: "Activity"
  },
  speaking: {
    title: "系统正在播报",
    description: "播报期间暂停监听，结束后会自动恢复。",
    icon: "AudioLines"
  },
  error: {
    title: "语音模式不可用",
    description: "请检查登录状态、腾讯云配置、麦克风权限和网络状态。",
    icon: "CircleAlert"
  },
  stopped: {
    title: "语音模式已停止",
    description: "点击重新开始后会继续监听语音指令。",
    icon: "MicOff"
  }
};

export default function VoiceScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const session = useVoiceSession();
  const copy = stateCopy[session.state];
  const listening = session.state === "listening-command" || session.state === "waiting-target" || session.state === "confirming-risk";
  const compact = height < 760;
  const microphoneSize = Math.min(width - 128, compact ? 104 : 144);
  const ringPadding = compact ? 20 : 32;

  async function exitVoiceMode() {
    await session.stopSession();
    router.back();
  }

  return (
    <PageContainer>
      <View className="flex-1">
        <Pressable onPress={exitVoiceMode} className="mb-3 mt-2 flex-row items-center">
          <LucideIcon name="ChevronLeft" color={palette.text} />
          <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>
            语音模式
          </Text>
        </Pressable>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          <View className={`items-center px-4 ${compact ? "pt-2" : "pt-6"}`}>
            <View
              className="items-center justify-center rounded-full"
              style={{ backgroundColor: `${palette.primary}10`, padding: ringPadding }}
            >
              <View
                className="items-center justify-center rounded-full"
                style={{ backgroundColor: `${palette.primary}18`, padding: ringPadding }}
              >
                <View
                  className="items-center justify-center rounded-full border"
                  style={{
                    height: microphoneSize,
                    width: microphoneSize,
                    backgroundColor: listening ? `${palette.primary}38` : `${palette.primary}20`,
                    borderColor: listening ? palette.primary : `${palette.primary}55`,
                    shadowColor: palette.primary,
                    shadowOpacity: listening ? 0.5 : 0.2,
                    shadowRadius: listening ? 28 : 12,
                    shadowOffset: { width: 0, height: 0 }
                  }}
                >
                  <LucideIcon name={copy.icon} color={palette.primaryText} size={compact ? 36 : 44} />
                </View>
              </View>
            </View>

            <Text className={`${compact ? "mt-4" : "mt-7"} text-center text-2xl font-bold`} style={{ color: palette.text }}>
              {copy.title}
            </Text>
            <Text className="mt-3 text-center text-sm leading-6" style={{ color: palette.textSoft }}>
              {copy.description}
            </Text>
          </View>

          <VoiceCard title="实时转写">
            <Text className="text-base font-semibold leading-7" style={{ color: session.transcript ? palette.text : palette.textMuted }}>
              {session.transcript || "等待你说话..."}
            </Text>
          </VoiceCard>

          {session.pendingCommand ? (
            <VoiceCard title="待执行指令">
              <Text className="text-sm leading-6" style={{ color: palette.text }}>
                {session.pendingCommand}
              </Text>
            </VoiceCard>
          ) : null}

          {session.candidates.length > 0 ? (
            <VoiceCard title={session.state === "waiting-target" ? "候选设备" : "目标设备"}>
              <View className="gap-2">
                {session.candidates.map((device) => (
                  <CandidateDevice
                    key={device.id}
                    device={device}
                    disabled={session.state !== "waiting-target"}
                    onPress={() => session.selectCandidate(device)}
                  />
                ))}
              </View>
            </VoiceCard>
          ) : null}

          {session.selectedTargets.length > 0 && session.state === "confirming-risk" ? (
            <VoiceCard title="高风险操作确认" tone="warning">
              <Text className="text-sm leading-6" style={{ color: palette.warning }}>
                即将对 {session.selectedTargets.map((device) => device.name).join("、")} 执行高风险操作。
              </Text>
              <View className="mt-4 flex-row gap-3">
                <VoiceButton label="取消" icon="X" grow onPress={session.cancelPending} />
                <VoiceButton label="确认执行" icon="Check" grow primary onPress={session.confirmRisk} />
              </View>
            </VoiceCard>
          ) : null}

          {session.lastResult ? (
            <VoiceCard title="最近结果">
              <Text className="text-sm leading-6" style={{ color: palette.text }}>
                {session.lastResult}
              </Text>
            </VoiceCard>
          ) : null}

          {session.errorMessage ? (
            <VoiceCard title="错误信息" tone="danger">
              <Text className="text-sm leading-6" style={{ color: palette.danger }}>
                {session.errorMessage}
              </Text>
            </VoiceCard>
          ) : null}
        </ScrollView>

        <View className="shrink-0 border-t pb-2 pt-3" style={{ borderColor: palette.line }}>
          {session.state === "error" || session.state === "stopped" ? (
            <VoiceButton label="重新开始监听" icon="Mic" primary onPress={session.startSession} />
          ) : (
            <VoiceButton label="停止语音模式" icon="MicOff" onPress={session.stopSession} />
          )}
          {session.pendingCommand && session.state !== "confirming-risk" ? (
            <View className="mt-2">
              <VoiceButton label="取消本轮指令" icon="X" onPress={session.cancelPending} />
            </View>
          ) : null}
        </View>
      </View>
    </PageContainer>
  );
}

function VoiceCard({
  title,
  tone = "normal",
  children
}: {
  title: string;
  tone?: "normal" | "warning" | "danger";
  children: ReactNode;
}) {
  const { palette } = useAppTheme();
  const borderColor = tone === "warning" ? `${palette.warning}66` : tone === "danger" ? `${palette.danger}66` : palette.line;
  return (
    <View className="mt-4 rounded-[24px] border p-4" style={{ backgroundColor: palette.panel, borderColor }}>
      <Text className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function CandidateDevice({
  device,
  disabled,
  onPress
}: {
  device: TargetDeviceMatch;
  disabled: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`rounded-2xl border p-3 ${disabled ? "opacity-80" : "active:opacity-70"}`}
      style={{ backgroundColor: palette.elevated, borderColor: palette.line }}
    >
      <Text className="text-sm font-bold" style={{ color: palette.text }}>
        {device.name}
      </Text>
      <Text className="mt-1 text-xs" style={{ color: palette.textMuted }}>
        {device.system} / {device.type} / {device.group}
      </Text>
    </Pressable>
  );
}

function VoiceButton({
  label,
  icon,
  grow = false,
  primary = false,
  onPress
}: {
  label: string;
  icon: string;
  grow?: boolean;
  primary?: boolean;
  onPress: () => void | Promise<void>;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className={`${grow ? "flex-1" : "w-full"} flex-row items-center justify-center rounded-full border px-4 py-3.5 active:opacity-75`}
      style={{
        backgroundColor: primary ? palette.primary : palette.panel,
        borderColor: primary ? palette.primary : palette.line
      }}
    >
      <LucideIcon name={icon} color={primary ? palette.primaryText : palette.text} size={18} />
      <Text className="ml-2 text-sm font-semibold" style={{ color: primary ? palette.primaryText : palette.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
