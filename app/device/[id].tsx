import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActionButton } from "@/components/ActionButton";
import { EmptyState } from "@/components/EmptyState";
import { LucideIcon } from "@/components/Icon";
import { LogItem } from "@/components/LogItem";
import { PageContainer } from "@/components/PageContainer";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { CommandLog } from "@/data/types";
import { useDeviceLogsQuery, useDeviceQuery, useDeviceQuickActionMutation } from "@/hooks/useDevices";
import { useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const deviceId = params.id;
  const deviceQuery = useDeviceQuery(deviceId);
  const logsQuery = useDeviceLogsQuery(deviceId);
  const quickActionMutation = useDeviceQuickActionMutation(deviceId);
  const setLastActionMessage = useAppStore((state) => state.setLastActionMessage);
  const lastActionMessage = useAppStore((state) => state.lastActionMessage);
  const device = deviceQuery.data;
  const latestLogs = mergeLatestLogs(logsQuery.data ?? [], lastActionMessage).slice(0, 4);

  if (deviceQuery.isLoading) {
    return (
      <PageContainer>
        <BackButton label="返回" />
        <EmptyState title="正在加载设备" description="正在读取设备详情并测试 Agent 连接。" />
      </PageContainer>
    );
  }

  if (!device) {
    return (
      <PageContainer>
        <BackButton label="返回" />
        <EmptyState title="设备不存在" description="后端没有找到这台设备，它可能已经被删除。" />
      </PageContainer>
    );
  }

  const actionPending = quickActionMutation.isPending;

  function runQuickAction(label: string) {
    const action = label === "打开浏览器" ? "open-url" : label === "打开应用" ? "open-app" : "test";
    quickActionMutation.mutate(
      { deviceId: device!.id, action },
      {
        onSuccess: (response) => setLastActionMessage(response.message),
        onError: (error) => setLastActionMessage(error.message)
      }
    );
  }

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <BackButton label="设备详情" />

        <Pressable
          onPress={() => router.push(`/device/${device.id}/info`)}
          className="mb-3 rounded-[28px] border p-4 active:opacity-80"
          style={{ backgroundColor: palette.panel, borderColor: palette.line }}
        >
          <View className="flex-row items-center">
            <View
              className="mr-3 h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${palette.primary}20` }}
            >
              <LucideIcon name={device.type === "手机" ? "Smartphone" : "Monitor"} color={palette.primary} size={24} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="mr-2 flex-1 text-xl font-bold" numberOfLines={1} style={{ color: palette.text }}>
                  {device.name}
                </Text>
                <StatusBadge status={device.status} />
              </View>
              <Text className="mt-1 text-sm" numberOfLines={1} style={{ color: palette.textSoft }}>
                {device.type} / {device.system} / {device.group}
              </Text>
            </View>
            <LucideIcon name="ChevronRight" color={palette.textMuted} size={22} />
          </View>
        </Pressable>

        <View className="gap-3">
          <SectionCard title="当前任务">
            <View className="flex-row items-start">
              <View className="mr-3 rounded-2xl p-2.5" style={{ backgroundColor: `${palette.primary}18` }}>
                <LucideIcon name="Activity" color={palette.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold leading-6" style={{ color: palette.text }}>
                  {device.currentTask}
                </Text>
              </View>
            </View>
          </SectionCard>

          <SectionCard title="快捷操作">
            <View className="flex-row flex-wrap gap-3">
              {device.quickActions.map((action) => (
                <View key={action} className="min-w-[46%] flex-1">
                  <ActionButton
                    label={actionPending ? "处理中" : action}
                    icon={action === "打开浏览器" ? "Globe" : action === "打开应用" ? "AppWindow" : "RefreshCcw"}
                    disabled={actionPending}
                    onPress={() => runQuickAction(action)}
                  />
                </View>
              ))}
            </View>
          </SectionCard>

          <View className="rounded-[24px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-base font-semibold" style={{ color: palette.text }}>
                运行日志
              </Text>
              <Pressable
                onPress={() => router.push(`/device/${device.id}/logs`)}
                className="flex-row items-center rounded-full px-3 py-2 active:opacity-70"
                style={{ backgroundColor: `${palette.primary}16` }}
              >
                <Text className="mr-1 text-xs font-semibold" style={{ color: palette.primary }}>
                  查看全部
                </Text>
                <LucideIcon name="ChevronRight" color={palette.primary} size={16} />
              </Pressable>
            </View>

            {logsQuery.isLoading ? (
              <Text className="py-4 text-center text-sm" style={{ color: palette.textMuted }}>
                正在加载日志...
              </Text>
            ) : latestLogs.length > 0 ? (
              <View className="gap-2">
                {latestLogs.map((log) => (
                  <LogItem key={log.id} log={log} />
                ))}
              </View>
            ) : (
              <View className="items-center rounded-[18px] border py-6" style={{ borderColor: palette.line }}>
                <LucideIcon name="Info" color={palette.textMuted} />
                <Text className="mt-2 text-sm" style={{ color: palette.textMuted }}>
                  暂无运行日志
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </PageContainer>
  );
}

function mergeLatestLogs(logs: CommandLog[], actionMessage?: string) {
  if (!actionMessage || logs[0]?.message === actionMessage) return logs;
  const level: CommandLog["level"] =
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
