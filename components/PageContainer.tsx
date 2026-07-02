import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "@/theme/AppTheme";

type Props = PropsWithChildren<{
  padded?: boolean;
}>;

export function PageContainer({ children, padded = true }: Props) {
  const { isDark, palette } = useAppTheme();

  return (
    <SafeAreaView style={{ flex: 1, minHeight: "100%", backgroundColor: palette.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className={padded ? "flex-1 px-4" : "flex-1"} style={{ flex: 1 }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
