import { Text, View } from "react-native";
import { CommandLog } from "@/data/types";
import { StatusBadge } from "./StatusBadge";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  log: CommandLog;
};

export function LogItem({ log }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="rounded-[18px] border p-3" style={{ backgroundColor: palette.elevated, borderColor: palette.line }}>
      <View className="mb-2 flex-row items-center justify-between">
        <StatusBadge level={log.level} />
        <Text className="text-xs" style={{ color: palette.textMuted }}>
          {log.time}
        </Text>
      </View>
      <Text className="text-sm leading-5" style={{ color: palette.text }}>
        {log.message}
      </Text>
    </View>
  );
}
