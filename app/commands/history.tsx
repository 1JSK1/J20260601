import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { EmptyState } from "@/components/EmptyState";
import { LucideIcon } from "@/components/Icon";
import { InlineState } from "@/components/InlineState";
import { PageContainer } from "@/components/PageContainer";
import type { CommandHistory } from "@/data/types";
import { useCommandDashboardQuery } from "@/hooks/useCommands";
import { useAppTheme } from "@/theme/AppTheme";

type TimeFilter = "all" | "today" | "7days" | "30days";
type ModeFilter = "all" | "文本" | "语音";

const timeOptions: Array<{ label: string; value: TimeFilter }> = [
  { label: "全部", value: "all" },
  { label: "今天", value: "today" },
  { label: "近7天", value: "7days" },
  { label: "近30天", value: "30days" }
];

const modeOptions: Array<{ label: string; value: ModeFilter }> = [
  { label: "全部模式", value: "all" },
  { label: "文本", value: "文本" },
  { label: "语音", value: "语音" }
];

export default function CommandHistoryScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const commandQuery = useCommandDashboardQuery();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");

  const history = commandQuery.data?.history ?? [];
  const filteredHistory = useMemo(
    () => history.filter((item) => matchesTime(item, timeFilter) && matchesMode(item, modeFilter)),
    [history, modeFilter, timeFilter]
  );

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <Pressable onPress={() => router.back()} className="mb-4 mt-2 flex-row items-center active:opacity-70">
          <LucideIcon name="ChevronLeft" color={palette.text} />
          <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>全部执行记录</Text>
        </Pressable>

        <View className="mb-4 rounded-[24px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
          <FilterTitle label="时间范围" />
          <View className="mb-4 flex-row flex-wrap gap-2">
            {timeOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={timeFilter === option.value}
                onPress={() => setTimeFilter(option.value)}
              />
            ))}
          </View>

          <FilterTitle label="指令模式" />
          <View className="flex-row gap-2">
            {modeOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={modeFilter === option.value}
                onPress={() => setModeFilter(option.value)}
                flex
              />
            ))}
          </View>
        </View>

        <View className="mb-2 flex-row items-center justify-between px-1">
          <Text className="text-base font-bold" style={{ color: palette.text }}>执行记录</Text>
          <Text className="text-xs" style={{ color: palette.textMuted }}>共 {filteredHistory.length} 条</Text>
        </View>

        {commandQuery.isLoading ? <InlineState title="正在加载" description="正在读取全部执行记录。" /> : null}
        {commandQuery.isError ? <InlineState title="记录加载失败" description={commandQuery.error.message} /> : null}
        {!commandQuery.isLoading && !commandQuery.isError && filteredHistory.length === 0 ? (
          <EmptyState title="没有匹配记录" description="当前时间和模式筛选条件下没有执行记录。" />
        ) : null}

        {filteredHistory.length > 0 ? (
          <View className="overflow-hidden rounded-[24px] border px-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
            {filteredHistory.map((item, index) => (
              <HistoryRow
                key={item.id}
                item={item}
                first={index === 0}
                onPress={() => router.push(`/commands/${item.id}`)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </PageContainer>
  );
}

function FilterTitle({ label }: { label: string }) {
  const { palette } = useAppTheme();
  return <Text className="mb-2 text-xs font-semibold" style={{ color: palette.textMuted }}>{label}</Text>;
}

function FilterChip({
  label,
  active,
  flex,
  onPress
}: {
  label: string;
  active: boolean;
  flex?: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      className={`${flex ? "flex-1" : ""} rounded-full border px-4 py-2.5 active:opacity-75`}
      style={{
        backgroundColor: active ? palette.primary : palette.elevated,
        borderColor: active ? palette.primary : palette.line
      }}
    >
      <Text className="text-center text-xs font-semibold" style={{ color: active ? palette.primaryText : palette.textSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

function HistoryRow({
  item,
  first,
  onPress
}: {
  item: CommandHistory;
  first: boolean;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  const success = item.result === "成功";
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center py-4 active:opacity-70 ${first ? "" : "border-t"}`}
      style={{ borderColor: palette.line }}
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.elevated }}>
        <LucideIcon name={success ? "Check" : "CircleAlert"} color={success ? palette.success : palette.danger} size={18} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 text-sm font-bold" numberOfLines={1} style={{ color: palette.text }}>{item.command}</Text>
          <ModeBadge mode={item.source ?? "文本"} />
        </View>
        <Text className="mt-1 text-xs" style={{ color: palette.textMuted }}>{item.time}</Text>
        <Text className="mt-1 text-xs" numberOfLines={1} style={{ color: palette.textSoft }}>
          {item.target} · {item.result}
        </Text>
      </View>
      <LucideIcon name="ChevronRight" size={18} color={palette.textMuted} />
    </Pressable>
  );
}

function ModeBadge({ mode }: { mode: "文本" | "语音" }) {
  const { palette } = useAppTheme();
  return (
    <View className="ml-2 rounded-full px-2.5 py-1" style={{ backgroundColor: `${palette.primary}18` }}>
      <Text className="text-[10px] font-semibold" style={{ color: palette.primary }}>{mode}</Text>
    </View>
  );
}

function matchesMode(item: CommandHistory, mode: ModeFilter) {
  return mode === "all" || (item.source ?? "文本") === mode;
}

function matchesTime(item: CommandHistory, filter: TimeFilter) {
  if (filter === "all") return true;
  const timestamp = new Date(item.time.replace(" ", "T")).getTime();
  if (Number.isNaN(timestamp)) return false;

  const now = new Date();
  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return timestamp >= start;
  }

  const days = filter === "7days" ? 7 : 30;
  return timestamp >= now.getTime() - days * 24 * 60 * 60 * 1000;
}
