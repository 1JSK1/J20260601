import { Text, View } from "react-native";
import { LucideIcon } from "./Icon";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="items-center rounded-3xl border border-dashed p-6" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <View className="mb-3 rounded-full p-3" style={{ backgroundColor: palette.surface }}>
        <LucideIcon name="Search" color={palette.textMuted} />
      </View>
      <Text className="text-base font-semibold" style={{ color: palette.text }}>{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5" style={{ color: palette.textSoft }}>{description}</Text>
    </View>
  );
}
