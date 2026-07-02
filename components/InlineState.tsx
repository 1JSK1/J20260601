import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  title: string;
  description?: string;
};

export function InlineState({ title, description }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="rounded-[22px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <Text className="text-sm font-semibold" style={{ color: palette.text }}>
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-xs leading-5" style={{ color: palette.textMuted }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
