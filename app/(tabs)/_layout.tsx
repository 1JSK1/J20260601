import { Tabs } from "expo-router";
import { LucideIcon } from "@/components/Icon";
import { useAppTheme } from "@/theme/AppTheme";

export default function TabsLayout() {
  const { palette } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: palette.line,
          backgroundColor: palette.surface
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600"
        },
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "设备",
          tabBarIcon: ({ color, size }) => <LucideIcon name="Monitor" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="commands"
        options={{
          title: "指令",
          tabBarIcon: ({ color, size }) => <LucideIcon name="Bot" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "我的",
          tabBarIcon: ({ color, size }) => <LucideIcon name="UserRound" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
