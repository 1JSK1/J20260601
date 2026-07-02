import { Text, View } from "react-native";
import { DeviceStatus, LogLevel } from "@/data/types";
import { useAppTheme } from "@/theme/AppTheme";

const deviceStatusMap: Record<DeviceStatus, { label: string; className: string; dot: string }> = {
  online: { label: "在线", className: "border-success/30 bg-success/10", dot: "bg-success" },
  offline: { label: "离线", className: "border-[#536176]/40 bg-[#536176]/15", dot: "bg-[#7F8DA3]" },
  warning: { label: "异常", className: "border-warning/40 bg-warning/10", dot: "bg-warning" }
};

const logLevelMap: Record<LogLevel, { label: string; className: string; dot: string }> = {
  info: { label: "信息", className: "border-primary/30 bg-primary/10", dot: "bg-primary" },
  success: { label: "成功", className: "border-success/30 bg-success/10", dot: "bg-success" },
  warning: { label: "警告", className: "border-warning/40 bg-warning/10", dot: "bg-warning" },
  error: { label: "错误", className: "border-danger/40 bg-danger/10", dot: "bg-danger" }
};

type Props = {
  status?: DeviceStatus;
  level?: LogLevel;
};

export function StatusBadge({ status, level }: Props) {
  const { palette, isDark } = useAppTheme();
  const meta = status ? deviceStatusMap[status] : level ? logLevelMap[level] : logLevelMap.info;
  const dotColor =
    status === "online" || level === "success"
      ? palette.success
      : status === "warning" || level === "warning"
        ? palette.warning
        : level === "error"
          ? palette.danger
          : status === "offline"
            ? palette.textMuted
            : palette.primary;

  return (
    <View
      className="flex-row items-center rounded-full border px-3 py-1.5"
      style={{
        borderColor: isDark ? `${dotColor}55` : `${dotColor}33`,
        backgroundColor: isDark ? `${dotColor}22` : `${dotColor}16`
      }}
    >
      <View className="mr-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      <Text className="text-xs font-medium" style={{ color: isDark ? palette.text : dotColor }}>
        {meta.label}
      </Text>
    </View>
  );
}
