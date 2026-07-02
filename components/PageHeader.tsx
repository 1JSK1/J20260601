import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  badge?: string;
};

export function PageHeader({ title, subtitle, eyebrow, badge }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="pb-5 pt-2">
      <View className="mb-2 flex-row items-center justify-between">
        {eyebrow ? (
          <Text className="text-xs font-medium tracking-wide" style={{ color: palette.primary }}>
            {eyebrow}
          </Text>
        ) : (
          <View />
        )}
        {badge ? (
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: palette.surface }}>
            <Text className="text-xs font-semibold" style={{ color: palette.text }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[26px] font-bold leading-8" style={{ color: palette.text }}>
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-2 text-[15px] leading-6" style={{ color: palette.textSoft }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
