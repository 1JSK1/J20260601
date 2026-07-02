import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { LucideIcon } from "@/components/Icon";
import { LogItem } from "@/components/LogItem";
import { PageContainer } from "@/components/PageContainer";
import type { CommandLog, LogLevel } from "@/data/types";
import { useDeviceLogsQuery, useDeviceQuery } from "@/hooks/useDevices";
import { useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

type LogFilter = "all" | "success" | "error";

const filters: Array<{ key: LogFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "success", label: "成功" },
  { key: "error", label: "错误" }
];

export default function DeviceLogsScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const deviceQuery = useDeviceQuery(params.id);
  const logsQuery = useDeviceLogsQuery(params.id);
  const lastActionMessage = useAppStore((state) => state.lastActionMessage);
  const [filter, setFilter] = useState<LogFilter>("all");
  const allLogs = useMemo(
    () => mergeLatestLogs(logsQuery.data ?? [], lastActionMessage),
    [lastActionMessage, logsQuery.data]
  );
  const visibleLogs = useMemo(
    () => (filter === "all" ? allLogs : allLogs.filter((log) => log.level === filter)),
    [allLogs, filter]
  );

  return (
    <PageContainer>
      <View className="flex-1">
        <Pressable onPress={() => router.back()} className="mb-3 mt-2 flex-row items-center">
          <LucideIcon name="ChevronLeft" color={palette.text} />
          <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>
            全部日志
          </Text>
        </Pressable>

        <View className="mb-3 rounded-[24px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
          <Text className="text-xl font-bold" style={{ color: palette.text }}>
            {deviceQuery.data?.name ?? "设备运行日志"}
          </Text>
          <Text className="mt-1 text-sm" style={{ color: palette.textSoft }}>
            共 {allLogs.length} 条记录，可按执行结果筛选
          </Text>

          <View className="mt-4 flex-row gap-2">
            {filters.map((item) => {
              const selected = filter === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  className="flex-1 rounded-full border px-3 py-2.5 active:opacity-75"
                  style={{
                    backgroundColor: selected ? palette.primary : palette.elevated,
                    borderColor: selected ? palette.primary : palette.line
                  }}
                >
                  <Text
                    className="text-center text-sm font-semibold"
                    style={{ color: selected ? palette.primaryText : palette.textSoft }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
          {logsQuery.isLoading ? (
            <Text className="py-8 text-center text-sm" style={{ color: palette.textMuted }}>
              正在加载日志...
            </Text>
          ) : visibleLogs.length > 0 ? (
            <View className="gap-2">
              {visibleLogs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </View>
          ) : (
            <EmptyState title="没有匹配的日志" description="当前筛选条件下没有运行记录。" />
          )}
        </ScrollView>
      </View>
    </PageContainer>
  );
}

function mergeLatestLogs(logs: CommandLog[], actionMessage?: string) {
  if (!actionMessage || logs[0]?.message === actionMessage) return logs;
  const level: LogLevel =
    actionMessage.includes("失败") || actionMessage.includes("无法") ? "error" : "success";
  return [
    {
      id: `latest-action-${actionMessage}`,
      time: "刚刚",
      level,
      message: actionMessage
    },
    ...logs
  ];
}
