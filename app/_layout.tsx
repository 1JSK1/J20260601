import "../global.css";
import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppThemeProvider, useAppTheme } from "@/theme/AppTheme";
import { AppProviders } from "@/providers/AppProviders";
import { useAuthSessionValidation } from "@/hooks/useAuth";

export default function RootLayout() {
  return (
    <AppProviders>
      <AppThemeProvider>
        <RootStack />
      </AppThemeProvider>
    </AppProviders>
  );
}

function RootStack() {
  const { palette } = useAppTheme();
  useAuthSessionValidation();

  return (
    <GestureHandlerRootView style={{ flex: 1, minHeight: "100%", backgroundColor: palette.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background }
        }}
      />
      <PortalHost />
    </GestureHandlerRootView>
  );
}
