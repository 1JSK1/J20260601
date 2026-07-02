import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LucideIcon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
import { useLogoutMutation } from "@/hooks/useAuth";
import { useDevicesQuery } from "@/hooks/useDevices";
import { useTencentSpeechConfigQuery } from "@/hooks/useTencentSpeech";
import { useAppStore } from "@/store/useAppStore";
import { AppThemeMode, useAppTheme } from "@/theme/AppTheme";

type SettingRowProps = {
  icon: string;
  label: string;
  value?: string;
  route?: string;
  onPress?: () => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { mode, setMode, palette } = useAppTheme();
  const authUser = useAppStore((state) => state.authUser);
  const apiConfig = useAppStore((state) => state.apiConfig);
  const devicesQuery = useDevicesQuery();
  const speechQuery = useTencentSpeechConfigQuery();
  const logoutMutation = useLogoutMutation();

  const backendStatus = !authUser
    ? "待登录"
    : devicesQuery.isLoading
      ? "检测中"
      : devicesQuery.isError
        ? "未连接"
        : "已连接";
  const speechStatus = !authUser
    ? "登录后配置"
    : speechQuery.isLoading
      ? "检测中"
      : speechQuery.data?.configured
        ? speechQuery.data.enabled
          ? "已配置"
          : "已停用"
        : "未配置";
  const deviceCount = authUser && devicesQuery.data ? `${devicesQuery.data.stats.total} 台` : "--";

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="mt-2">
          <AccountOverview
            loggedIn={Boolean(authUser)}
            displayName={authUser?.displayName || authUser?.username || "登录账号"}
            username={authUser?.username}
            onPress={() => router.push("/settings/account")}
          />
        </View>

        <View className="mt-4 flex-row rounded-[24px] border px-2 py-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
          <StatusItem
            label="后端服务"
            value={backendStatus}
            tone={!authUser ? "warning" : devicesQuery.isError ? "danger" : "success"}
          />
          <StatusDivider />
          <StatusItem label="语音识别" value={speechStatus} tone={speechQuery.data?.configured ? "success" : "warning"} />
          <StatusDivider />
          <StatusItem label="设备数量" value={deviceCount} />
        </View>

        <SettingsGroup title="连接与服务">
          <SettingRow
            icon="Server"
            label="后端连接"
            value={apiConfig.baseUrl.replace(/^https?:\/\//, "")}
            route="/settings/backend"
          />
          <SettingRow
            icon="AudioLines"
            label="腾讯云语音识别"
            value={speechStatus}
            route="/settings/tencent-speech"
          />
          <SettingRow
            icon="Volume2"
            label="语音播报"
            value="系统声音"
            route="/settings/speech-output"
          />
        </SettingsGroup>

        <SettingsGroup title="应用设置">
          <View className="px-4 py-3">
            <View className="mb-3 flex-row items-center">
              <SettingIcon name={mode === "dark" ? "Moon" : "Sun"} />
              <Text className="flex-1 text-[15px] font-semibold" style={{ color: palette.text }}>外观模式</Text>
            </View>
            <View className="flex-row rounded-full p-1" style={{ backgroundColor: palette.elevated }}>
              <ThemeOption label="深色" value="dark" active={mode === "dark"} onPress={setMode} />
              <ThemeOption label="浅色" value="light" active={mode === "light"} onPress={setMode} />
            </View>
          </View>
          <SettingRow icon="ShieldCheck" label="指令与风险确认" value="已启用" route="/settings/command" />
          <SettingRow icon="ScrollText" label="数据与日志" route="/settings/data" />
        </SettingsGroup>

        <SettingsGroup title="关于">
          <SettingRow icon="Info" label="App 版本" value="0.1.0" route="/settings/about" />
          <SettingRow icon="Shield" label="隐私说明" route="/settings/privacy" />
        </SettingsGroup>

        {authUser ? (
          <Pressable
            disabled={logoutMutation.isPending}
            onPress={() => logoutMutation.mutate()}
            className="mt-5 flex-row items-center justify-center py-3 active:opacity-70"
          >
            <LucideIcon name="LogOut" size={18} color={palette.danger} />
            <Text className="ml-2 text-sm font-semibold" style={{ color: palette.danger }}>
              {logoutMutation.isPending ? "正在退出..." : "退出登录"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </PageContainer>
  );
}

function AccountOverview({
  loggedIn,
  displayName,
  username,
  onPress
}: {
  loggedIn: boolean;
  displayName: string;
  username?: string;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-[28px] p-5 active:opacity-85"
      style={{ backgroundColor: loggedIn ? palette.primary : palette.panel }}
    >
      <View
        className="mr-4 h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: loggedIn ? "rgba(255,255,255,0.18)" : `${palette.primary}20` }}
      >
        <Text className="text-xl font-bold" style={{ color: loggedIn ? "#FFFFFF" : palette.primary }}>
          {loggedIn ? getInitials(displayName) : "登录"}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="text-xl font-bold" style={{ color: loggedIn ? "#FFFFFF" : palette.text }}>
          {displayName}
        </Text>
        <Text className="mt-1 text-sm" style={{ color: loggedIn ? "rgba(255,255,255,0.76)" : palette.textMuted }}>
          {loggedIn ? `@${username}` : "同步设备、配置和执行记录"}
        </Text>
        <Text className="mt-2 text-xs font-semibold" style={{ color: loggedIn ? "rgba(255,255,255,0.82)" : palette.primary }}>
          {loggedIn ? "账号已登录" : "点击登录或注册"}
        </Text>
      </View>
      <LucideIcon name="ChevronRight" color={loggedIn ? "#FFFFFF" : palette.textMuted} />
    </Pressable>
  );
}

function StatusItem({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "danger";
}) {
  const { palette } = useAppTheme();
  const color = tone ? palette[tone] : palette.text;
  return (
    <View className="flex-1 items-center px-1">
      <Text className="text-[11px]" style={{ color: palette.textMuted }}>{label}</Text>
      <Text className="mt-2 text-sm font-bold" numberOfLines={1} style={{ color }}>{value}</Text>
    </View>
  );
}

function StatusDivider() {
  const { palette } = useAppTheme();
  return <View className="w-px self-stretch" style={{ backgroundColor: palette.line }} />;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette } = useAppTheme();
  return (
    <View className="mt-5">
      <Text className="mb-2 ml-1 text-sm font-semibold" style={{ color: palette.textMuted }}>{title}</Text>
      <View className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
        {children}
      </View>
    </View>
  );
}

function SettingRow({ icon, label, value, route, onPress }: SettingRowProps) {
  const router = useRouter();
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={onPress ?? (() => route && router.push(route))}
      className="flex-row items-center border-b px-4 py-3.5 active:opacity-70"
      style={{ borderColor: palette.line }}
    >
      <SettingIcon name={icon} />
      <Text className="flex-1 text-[15px] font-semibold" style={{ color: palette.text }}>{label}</Text>
      {value ? (
        <Text className="ml-3 max-w-[46%] text-right text-xs" numberOfLines={1} style={{ color: palette.textMuted }}>
          {value}
        </Text>
      ) : null}
      <LucideIcon name="ChevronRight" size={18} color={palette.textMuted} />
    </Pressable>
  );
}

function SettingIcon({ name }: { name: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${palette.primary}18` }}>
      <LucideIcon name={name} size={17} color={palette.primary} />
    </View>
  );
}

function ThemeOption({
  label,
  value,
  active,
  onPress
}: {
  label: string;
  value: AppThemeMode;
  active: boolean;
  onPress: (value: AppThemeMode) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      onPress={() => onPress(value)}
      className="flex-1 rounded-full px-4 py-2.5"
      style={{ backgroundColor: active ? palette.primary : "transparent" }}
    >
      <Text className="text-center text-xs font-semibold" style={{ color: active ? palette.primaryText : palette.textSoft }}>
        {label}
      </Text>
    </Pressable>
  );
}

function getInitials(value: string) {
  return value.trim().slice(0, 2).toUpperCase() || "U";
}
