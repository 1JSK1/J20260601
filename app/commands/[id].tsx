import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { LucideIcon } from "@/components/Icon";
import { LogItem } from "@/components/LogItem";
import { PageContainer } from "@/components/PageContainer";
import { SectionCard } from "@/components/SectionCard";
import { CommandHistory, CommandLog } from "@/data/types";
import { useCommandQuery } from "@/hooks/useCommands";
import { useAppTheme } from "@/theme/AppTheme";

export default function CommandDetailScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const commandQuery = useCommandQuery(params.id);
  const command = commandQuery.data;

  if (commandQuery.isLoading) {
    return (
      <PageContainer>
        <BackButton label="返回" />
        <EmptyState title="正在加载指令" description="正在从 App 后端读取指令详情。" />
      </PageContainer>
    );
  }

  if (!command) {
    return (
      <PageContainer>
        <BackButton label="返回" />
        <EmptyState title="指令不存在" description="后端没有找到这条指令记录。" />
      </PageContainer>
    );
  }

  const logs = buildCommandLogs(command);

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <BackButton label="指令详情" />

        <View className="mb-4 rounded-3xl border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
          <Text className="text-xl font-bold leading-7" style={{ color: palette.text }}>
            {command.command}
          </Text>
          <Text className="mt-3 text-sm" style={{ color: palette.textSoft }}>
            目标设备：{command.target}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: palette.textMuted }}>
            执行时间：{command.time}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: palette.textMuted }}>
            指令来源：{command.source ?? "文本"}
          </Text>
        </View>

        <View className="gap-3">
          <SectionCard title="指令信息">
            <InfoRow label="记录 ID" value={command.id} />
            <InfoRow label="设备名称" value={command.target} />
            <InfoRow label="设备 ID" value={command.deviceId ?? "未知"} />
            <InfoRow label="完整指令" value={command.command} last />
          </SectionCard>

          <SectionCard title="执行结果">
            <InfoRow label="状态" value={command.result} />
            <InfoRow label="风险级别" value={command.highRisk ? "高风险，需要二次确认" : "普通指令"} />
            <InfoRow label="说明" value={command.detail} last />
          </SectionCard>

          <SectionCard title="执行记录">
            <View className="gap-2">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </View>
          </SectionCard>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

function BackButton({ label }: { label: string }) {
  const router = useRouter();
  const { palette } = useAppTheme();

  return (
    <Pressable onPress={() => router.back()} className="mb-3 mt-2 flex-row items-center">
      <LucideIcon name="ChevronLeft" color={palette.text} />
      <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

function buildCommandLogs(command: CommandHistory): CommandLog[] {
  const level = command.result === "成功" ? "success" : command.result === "失败" ? "error" : "warning";

  return [
    { id: `${command.id}-received`, time: command.time, level: "info", message: `后端记录指令：${command.command}` },
    { id: `${command.id}-target`, time: command.time, level: "info", message: `目标设备：${command.target}` },
    { id: `${command.id}-result`, time: command.time, level, message: command.detail }
  ];
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useAppTheme();

  return (
    <View className={`py-2 ${last ? "" : "border-b"}`} style={{ borderColor: palette.line }}>
      <Text className="text-xs" style={{ color: palette.textMuted }}>
        {label}
      </Text>
      <Text className="mt-1 text-sm font-medium leading-5" style={{ color: palette.text }}>
        {value}
      </Text>
    </View>
  );
}
