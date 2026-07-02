import { ComponentProps, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LucideIcon } from "@/components/Icon";
import { InlineState } from "@/components/InlineState";
import { PageContainer } from "@/components/PageContainer";
import { SectionCard } from "@/components/SectionCard";
import { useConnectionTestMutation } from "@/hooks/useActions";
import { useSaveUserApiConfigMutation, useUserApiConfigQuery } from "@/hooks/useApiConfig";
import { useLoginMutation, useRegisterMutation } from "@/hooks/useAuth";
import {
  useSaveTencentSpeechConfigMutation,
  useTencentSpeechConfigQuery
} from "@/hooks/useTencentSpeech";
import { useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

type AuthMode = "login" | "register";

const titles: Record<string, string> = {
  account: "账号信息",
  backend: "后端连接",
  "tencent-speech": "腾讯云语音识别",
  "speech-output": "语音播报",
  command: "指令与风险确认",
  data: "数据与日志",
  about: "关于",
  privacy: "隐私说明"
};

export default function SettingDetailScreen() {
  const params = useLocalSearchParams<{ section: string }>();
  const section = params.section ?? "";
  const title = titles[section] ?? "设置详情";

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <BackButton label={title} />
        {section === "account" ? <AccountPage /> : null}
        {section === "backend" ? <BackendPage /> : null}
        {section === "tencent-speech" ? <TencentSpeechPage /> : null}
        {section === "speech-output" ? <SpeechOutputPage /> : null}
        {section === "command" ? <CommandSettingsPage /> : null}
        {section === "data" ? <DataPage /> : null}
        {section === "about" ? <AboutPage /> : null}
        {section === "privacy" ? <PrivacyPage /> : null}
        {!titles[section] ? <InfoOnly title="暂未接入" description="该设置项还没有对应的真实配置页面。" /> : null}
      </ScrollView>
    </PageContainer>
  );
}

function AccountPage() {
  const authUser = useAppStore((state) => state.authUser);
  const apiConfig = useAppStore((state) => state.apiConfig);

  if (!authUser) {
    return <AuthCard />;
  }

  return (
    <View className="gap-3">
      <SectionCard title="账号概览">
        <InfoRow label="显示名称" value={authUser.displayName || authUser.username} />
        <InfoRow label="用户名" value={authUser.username} />
        <InfoRow label="用户 ID" value={authUser.id} />
        <InfoRow label="账号状态" value={authUser.status === "active" ? "正常" : authUser.status} />
        <InfoRow label="会话状态" value={apiConfig.sessionId ? "当前设备已认证" : "未认证"} last />
      </SectionCard>
      <InfoOnly
        title="数据隔离"
        description="登录后，设备、指令记录、后端配置和腾讯云语音配置都会按账号隔离保存。"
      />
    </View>
  );
}

function AuthCard() {
  const { palette } = useAppTheme();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const activeMutation = authMode === "login" ? loginMutation : registerMutation;
  const errorMessage = activeMutation.error instanceof Error ? activeMutation.error.message : "";
  const canSubmit = username.trim().length >= 3 && password.length >= 6 && !activeMutation.isPending;

  const submit = () => {
    if (!canSubmit) return;
    if (authMode === "login") {
      loginMutation.mutate(
        { username: username.trim(), password },
        { onSuccess: () => router.back() }
      );
    } else {
      registerMutation.mutate(
        { username: username.trim(), password, displayName: displayName.trim() },
        { onSuccess: () => router.back() }
      );
    }
  };

  return (
    <View className="rounded-[26px] border p-5" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <View className="mb-5 flex-row rounded-full p-1" style={{ backgroundColor: palette.elevated }}>
        <AuthModeOption label="登录" value="login" active={authMode === "login"} onPress={setAuthMode} />
        <AuthModeOption label="注册" value="register" active={authMode === "register"} onPress={setAuthMode} />
      </View>

      {authMode === "register" ? (
        <Field label="显示名称" value={displayName} onChangeText={setDisplayName} placeholder="例如：JSK" autoCapitalize="words" />
      ) : null}
      <Field label="用户名" value={username} onChangeText={setUsername} placeholder="请输入用户名" autoCapitalize="none" />
      <Field
        label="密码"
        value={password}
        onChangeText={setPassword}
        placeholder="至少 6 位"
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={submit}
      />

      {errorMessage ? <Message tone="danger" text={errorMessage} /> : null}

      <PrimaryButton
        disabled={!canSubmit}
        icon={authMode === "login" ? "KeyRound" : "UserRound"}
        label={activeMutation.isPending ? "处理中..." : authMode === "login" ? "登录账号" : "创建账号并登录"}
        onPress={submit}
      />
    </View>
  );
}

function BackendPage() {
  const { palette } = useAppTheme();
  const authUser = useAppStore((state) => state.authUser);
  const apiConfig = useAppStore((state) => state.apiConfig);
  const configQuery = useUserApiConfigQuery();
  const saveMutation = useSaveUserApiConfigMutation();
  const [baseUrl, setBaseUrl] = useState(apiConfig.baseUrl);
  const connectionTestMutation = useConnectionTestMutation();

  useEffect(() => {
    if (configQuery.data?.backendBaseUrl) {
      setBaseUrl(configQuery.data.backendBaseUrl);
    }
  }, [configQuery.data?.backendBaseUrl]);

  const valid = /^https?:\/\/[^/\s]+(?::\d+)?(?:\/.*)?$/.test(baseUrl.trim());
  const changed = baseUrl.trim() !== apiConfig.baseUrl;
  const canSave = valid && changed && !saveMutation.isPending;

  function save() {
    if (!canSave) return;
    saveMutation.mutate(baseUrl.trim());
  }

  return (
    <View className="gap-3">
      <SectionCard title="后端 Base URL">
        {!authUser ? <InlineState title="本地连接配置" description="未登录时可先保存后端地址，登录请求会立即使用该地址。" /> : null}
        <Field
          label="Base URL"
          value={baseUrl}
          onChangeText={setBaseUrl}
          placeholder="例如：http://192.168.87.209:8008"
          autoCapitalize="none"
          editable
        />
        {!valid ? <Text className="mb-4 text-xs" style={{ color: palette.warning }}>请输入 http:// 或 https:// 开头的地址。</Text> : null}
        {saveMutation.error instanceof Error ? <Message tone="danger" text={saveMutation.error.message} /> : null}
        {saveMutation.isSuccess ? (
          <Message
            tone="success"
            text={authUser ? "配置已保存到当前账号和手机本地。" : "配置已保存到手机本地，现在可以使用该地址登录。"}
          />
        ) : null}
        <PrimaryButton disabled={!canSave} icon="Save" label={saveMutation.isPending ? "正在保存..." : "保存配置"} onPress={save} />
      </SectionCard>

      <SectionCard title="连接测试">
        <InfoRow label="当前地址" value={apiConfig.baseUrl} />
        {connectionTestMutation.data ? (
          <InfoRow label="最近测试" value={`${connectionTestMutation.data.message}，${connectionTestMutation.data.latencyMs}ms`} />
        ) : null}
        {connectionTestMutation.error ? <Message tone="danger" text={connectionTestMutation.error.message} /> : null}
        <PrimaryButton
          disabled={!valid || connectionTestMutation.isPending}
          icon="Wifi"
          label={connectionTestMutation.isPending ? "测试中..." : "测试连接"}
          onPress={() => connectionTestMutation.mutate({ baseUrl: baseUrl.trim(), apiKey: "", model: apiConfig.model })}
        />
      </SectionCard>
    </View>
  );
}

function TencentSpeechPage() {
  const authUser = useAppStore((state) => state.authUser);
  const query = useTencentSpeechConfigQuery();
  const mutation = useSaveTencentSpeechConfigMutation();
  const [appId, setAppId] = useState("");
  const [secretId, setSecretId] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!query.data) return;
    setAppId(query.data.appId);
    setSecretId(query.data.secretId);
    setSecretKey("");
    setEnabled(query.data.enabled);
  }, [query.data]);

  const needsSecretKey = !query.data?.secretKeyConfigured;
  const valid =
    Boolean(authUser) &&
    /^\d{5,32}$/.test(appId.trim()) &&
    secretId.trim().length >= 8 &&
    (!needsSecretKey || secretKey.trim().length > 0) &&
    !mutation.isPending;
  const error =
    mutation.error instanceof Error
      ? mutation.error.message
      : query.error instanceof Error
        ? query.error.message
        : "";

  const save = () => {
    if (!valid) return;
    mutation.mutate({
      appId: appId.trim(),
      secretId: secretId.trim(),
      secretKey: secretKey.trim(),
      engine: "16k_zh",
      enabled
    });
  };

  return (
    <View className="gap-3">
      <SectionCard title="配置状态">
        <InfoRow label="状态" value={query.data?.configured ? (query.data.enabled ? "已配置并启用" : "已配置但停用") : "未配置"} />
        <InfoRow label="识别引擎" value="16k_zh" />
        <InfoRow label="SecretKey" value={query.data?.secretKeyConfigured ? "已保存，不会返回前端" : "未保存"} last />
      </SectionCard>

      <SectionCard title="腾讯云凭证">
        {!authUser ? (
          <InlineState title="请先登录" description="登录后才能为当前账号保存腾讯云语音识别配置。" />
        ) : query.isLoading ? (
          <InlineState title="正在加载" description="正在读取当前账号的腾讯云配置。" />
        ) : (
          <>
            <Field label="腾讯云 AppID" value={appId} onChangeText={setAppId} placeholder="纯数字 AppID" keyboardType="number-pad" autoCapitalize="none" />
            <Field
              label="SecretID"
              value={secretId}
              onChangeText={setSecretId}
              placeholder="输入腾讯云 SecretID"
              autoCapitalize="none"
              style={{ fontSize: 14 }}
            />
            <Field
              label="SecretKey"
              value={secretKey}
              onChangeText={setSecretKey}
              placeholder={query.data?.secretKeyConfigured ? "已配置，留空表示保持不变" : "输入腾讯云 SecretKey"}
              secureTextEntry
              autoCapitalize="none"
            />
            <ToggleRow label="启用云端语音识别" description="App 每轮监听前申请5分钟签名。" value={enabled} onChange={setEnabled} />
            {error ? <Message tone="danger" text={error} /> : null}
            {mutation.isSuccess ? <Message tone="success" text="配置已保存到当前账号。" /> : null}
            <PrimaryButton disabled={!valid} icon="Check" label={mutation.isPending ? "正在保存..." : "保存语音配置"} onPress={save} />
          </>
        )}
      </SectionCard>
    </View>
  );
}

function SpeechOutputPage() {
  return (
    <View className="gap-3">
      <InfoOnly title="当前播报方式" description="系统回复使用手机系统 TTS 播报，不是腾讯云合成声音。" />
      <SectionCard title="可优化方向">
        <InfoRow label="声音来源" value="手机系统 TTS" />
        <InfoRow label="语言" value="中文 zh-CN" />
        <InfoRow label="下一步" value="可增加语速、音调、音色选择" last />
      </SectionCard>
    </View>
  );
}

function CommandSettingsPage() {
  return (
    <View className="gap-3">
      <InfoOnly title="风险确认" description="删除、解绑、重启、关机和批量控制会进入确认流程，未确认前不会调用设备接口。" />
      <SectionCard title="当前规则">
        <InfoRow label="文本模式" value="必须选择目标设备" />
        <InfoRow label="语音模式" value="必须从语音明确目标设备" />
        <InfoRow label="批量操作" value="高风险时必须确认" last />
      </SectionCard>
    </View>
  );
}

function DataPage() {
  return (
    <View className="gap-3">
      <InfoOnly title="数据与日志" description="设备、指令记录和运行日志由后端按账号隔离保存；手机端只保存登录会话和基础配置。" />
      <SectionCard title="保存位置">
        <InfoRow label="设备数据" value="后端 SQLite" />
        <InfoRow label="执行记录" value="后端 SQLite" />
        <InfoRow label="登录会话" value="手机安全存储" last />
      </SectionCard>
    </View>
  );
}

function AboutPage() {
  return (
    <SectionCard title="My App">
      <InfoRow label="版本" value="0.1.0" />
      <InfoRow label="后端版本" value="0.7.0" />
      <InfoRow label="主要能力" value="设备管理、文本指令、语音指令" last />
    </SectionCard>
  );
}

function PrivacyPage() {
  return (
    <InfoOnly
      title="隐私说明"
      description="当前语音模式不保存原始录音；腾讯云语音识别只传输实时 PCM 音频流；账号凭证和配置按用户隔离保存。"
    />
  );
}

function BackButton({ label }: { label: string }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  return (
    <Pressable onPress={() => router.back()} className="mb-3 mt-2 flex-row items-center active:opacity-70">
      <LucideIcon name="ChevronLeft" color={palette.text} />
      <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>{label}</Text>
    </Pressable>
  );
}

function InfoOnly({ title, description }: { title: string; description: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="rounded-[26px] border p-5" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <Text className="text-lg font-bold" style={{ color: palette.text }}>{title}</Text>
      <Text className="mt-2 text-sm leading-6" style={{ color: palette.textSoft }}>{description}</Text>
    </View>
  );
}

function Field({
  label,
  style,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
}) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold" style={{ color: palette.textSoft }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.textMuted}
        className="rounded-[20px] border px-4 py-4 text-base"
        style={[{ backgroundColor: palette.elevated, borderColor: palette.line, color: palette.text }, style]}
      />
    </View>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View className={`py-2 ${last ? "" : "border-b"}`} style={{ borderColor: palette.line }}>
      <Text className="text-xs" style={{ color: palette.textMuted }}>{label}</Text>
      <Text className="mt-1 text-sm font-medium leading-5" style={{ color: palette.text }}>{value}</Text>
    </View>
  );
}

function Message({ tone, text }: { tone: "success" | "danger"; text: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-4 rounded-2xl px-4 py-3" style={{ backgroundColor: `${palette[tone]}18` }}>
      <Text className="text-sm" style={{ color: palette[tone] }}>{text}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-4 flex-row items-center justify-between rounded-[20px] border px-4 py-3" style={{ backgroundColor: palette.elevated, borderColor: palette.line }}>
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold" style={{ color: palette.text }}>{label}</Text>
        <Text className="mt-1 text-xs" style={{ color: palette.textMuted }}>{description}</Text>
      </View>
      <Pressable onPress={() => onChange(!value)} className="rounded-full px-4 py-2" style={{ backgroundColor: value ? palette.primary : palette.line }}>
        <Text className="text-xs font-bold" style={{ color: value ? palette.primaryText : palette.textSoft }}>{value ? "已启用" : "已停用"}</Text>
      </Pressable>
    </View>
  );
}

function PrimaryButton({
  disabled,
  icon,
  label,
  onPress
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center justify-center rounded-full py-4"
      style={{ backgroundColor: disabled ? palette.line : palette.primary, opacity: disabled ? 0.7 : 1 }}
    >
      <LucideIcon name={icon} size={18} color={palette.primaryText} />
      <Text className="ml-2 text-sm font-bold" style={{ color: palette.primaryText }}>{label}</Text>
    </Pressable>
  );
}

function AuthModeOption({
  label,
  value,
  active,
  onPress
}: {
  label: string;
  value: AuthMode;
  active: boolean;
  onPress: (value: AuthMode) => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable onPress={() => onPress(value)} className="flex-1 rounded-full px-4 py-2.5" style={{ backgroundColor: active ? palette.primary : "transparent" }}>
      <Text className="text-center text-sm font-semibold" style={{ color: active ? palette.primaryText : palette.textSoft }}>{label}</Text>
    </Pressable>
  );
}
