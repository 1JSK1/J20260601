import { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Props = PropsWithChildren<{
  title?: string;
}>;

export function SectionCard({ title, children }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="rounded-[24px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      {title ? (
        <Text className="mb-3 text-base font-semibold" style={{ color: palette.text }}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
