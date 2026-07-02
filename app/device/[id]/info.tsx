import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActionButton } from "@/components/ActionButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { LucideIcon } from "@/components/Icon";
import { PageContainer } from "@/components/PageContainer";
import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDeviceActionMutation } from "@/hooks/useActions";
import { useDeviceQuery, useUpdateDeviceMutation } from "@/hooks/useDevices";
import { useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

export default function DeviceInfoScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const deviceQuery = useDeviceQuery(params.id);
  const updateDeviceMutation = useUpdateDeviceMutation(params.id);
  const deviceActionMutation = useDeviceActionMutation(params.id);
  const setLastActionMessage = useAppStore((state) => state.setLastActionMessage);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [groupName, setGroupName] = useState("");
  const [note, setNote] = useState("");
  const [pairingToken, setPairingToken] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "warning" | "danger"; message: string } | null>(null);
  const device = deviceQuery.data;

  useEffect(() => {
    if (!device) return;
    setName(device.name);
    setHost(device.host);
    setPort(String(device.port));
    setGroupName(device.group);
    setNote(device.note);
  }, [device]);

  function saveConfiguration() {
    if (!device) return;
    const normalizedName = name.trim();
    const normalizedHost = host.trim();
    const normalizedPort = Number(port.trim());
    const normalizedGroup = groupName.trim();

    if (!normalizedName || !normalizedHost || !Number.isInteger(normalizedPort) || normalizedPort < 1 || normalizedPort > 65535) {
      setFeedback({ tone: "danger", message: "请填写有效的设备名称、IP 地址或主机名和端口。" });
      return;
    }

    setFeedback(null);
    updateDeviceMutation.mutate(
      {
        deviceId: device.id,
        name: normalizedName,
        host: normalizedHost,
        port: normalizedPort,
        groupName: normalizedGroup || "默认分组",
        note: note.trim(),
        pairingToken: pairingToken.trim() || undefined
      },
      {
        onSuccess: ({ device: updatedDevice, test }) => {
          setPairingToken("");
          const message = test.ok
            ? `配置已保存，${updatedDevice.host}:${updatedDevice.port} 连接测试成功。`
            : `配置已保存，但连接测试失败：${test.message}`;
          setFeedback({ tone: test.ok ? "success" : "warning", message });
          setLastActionMessage(message);
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "保存设备配置失败。";
          setFeedback({ tone: "danger", message });
          setLastActionMessage(message);
        }
      }
    );
  }

  if (deviceQuery.isLoading) {
    return (
      <PageContainer>
        <BackButton />
        <EmptyState title="正在加载设备信息" description="正在从后端读取设备配置。" />
      </PageContainer>
    );
  }

  if (!device) {
    return (
      <PageContainer>
        <BackButton />
        <EmptyState title="设备不存在" description="后端没有找到这台设备。" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <BackButton />

        <View className="mb-3 rounded-[28px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
          <View className="flex-row items-center">
            <View className="mr-3 rounded-2xl p-3" style={{ backgroundColor: `${palette.primary}20` }}>
              <LucideIcon name="Info" color={palette.primary} size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold" style={{ color: palette.text }}>
                {device.name}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: palette.textSoft }}>
                设备资料与管理
              </Text>
            </View>
            <StatusBadge status={device.status} />
          </View>
        </View>

        <View className="gap-3">
          <SectionCard title="基本信息">
            <InfoRow label="设备编号" value={device.serial} />
            <InfoRow label="设备类型" value={device.type} />
            <InfoRow label="所属系统" value={device.system} />
            <InfoRow label="型号或版本" value={device.model} last />
          </SectionCard>

          <SectionCard title="网络状态">
            <InfoRow label="设备地址" value={device.host} />
            <InfoRow label="Agent 端口" value={String(device.port)} />
            <InfoRow label="连接状态" value={device.connection} />
            <InfoRow label="访问范围" value="局域网" />
            <InfoRow label="最后心跳" value={device.lastHeartbeat} last />
          </SectionCard>

          <SectionCard title="设备配置">
            <ConfigInput label="设备名称" value={name} onChangeText={setName} placeholder="例如：办公室电脑" />
            <ConfigInput
              label="IP 地址或主机名"
              value={host}
              onChangeText={setHost}
              placeholder="例如：192.168.1.20"
              autoCapitalize="none"
              keyboardType="url"
            />
            <ConfigInput
              label="Agent 端口"
              value={port}
              onChangeText={setPort}
              placeholder="7821"
              keyboardType="number-pad"
            />
            <ConfigInput label="设备分组" value={groupName} onChangeText={setGroupName} placeholder="默认分组" />
            <ConfigInput label="备注信息" value={note} onChangeText={setNote} placeholder="设备用途或位置" multiline />
            <ConfigInput
              label="配对 Token"
              value={pairingToken}
              onChangeText={setPairingToken}
              placeholder={device.pairingTokenConfigured ? "已配置，留空保持不变" : "请输入 Agent 配对 Token"}
              autoCapitalize="none"
              secureTextEntry
            />

            <View className="mb-4 flex-row items-center rounded-2xl px-3 py-2.5" style={{ backgroundColor: `${palette.primary}12` }}>
              <LucideIcon name="Database" color={palette.primary} size={17} />
              <Text className="ml-2 flex-1 text-xs leading-5" style={{ color: palette.textSoft }}>
                保存后写入当前登录账号的后端数据库，并立即使用新地址测试 Agent 连接。
              </Text>
            </View>

            {feedback ? (
              <View
                className="mb-4 rounded-2xl px-3 py-2.5"
                style={{
                  backgroundColor: `${
                    feedback.tone === "success" ? palette.success : feedback.tone === "warning" ? palette.warning : palette.danger
                  }14`
                }}
              >
                <Text
                  className="text-xs leading-5"
                  style={{
                    color:
                      feedback.tone === "success" ? palette.success : feedback.tone === "warning" ? palette.warning : palette.danger
                  }}
                >
                  {feedback.message}
                </Text>
              </View>
            ) : null}

            <ActionButton
              label={updateDeviceMutation.isPending ? "正在保存" : "保存设备配置"}
              icon="Save"
              variant="primary"
              disabled={updateDeviceMutation.isPending}
              onPress={saveConfiguration}
            />
          </SectionCard>

          <SectionCard title="设备管理">
            <Text className="mb-4 text-sm leading-6" style={{ color: palette.textSoft }}>
              删除后会移除该设备及其关联日志和指令记录，此操作不可撤销。
            </Text>
            <ActionButton label="删除设备" icon="Trash2" variant="danger" onPress={() => setDeleteOpen(true)} />
          </SectionCard>
        </View>
      </ScrollView>

      <ConfirmDialog
        open={deleteOpen}
        title="确认删除设备？"
        description="删除后设备会从当前账号中移除，关联日志和指令记录也会被删除。"
        confirmText={deviceActionMutation.isPending ? "正在删除" : "删除设备"}
        danger
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          deviceActionMutation.mutate(
            { deviceId: device.id, action: "delete", confirmed: true },
            {
              onSuccess: (response) => {
                setLastActionMessage(response.message);
                router.replace("/");
              },
              onError: (error) => setLastActionMessage(error.message)
            }
          );
        }}
      />
    </PageContainer>
  );
}

type ConfigInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "url" | "number-pad";
  autoCapitalize?: "none" | "sentences";
  secureTextEntry?: boolean;
  multiline?: boolean;
};

function ConfigInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "sentences",
  secureTextEntry,
  multiline
}: ConfigInputProps) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-semibold" style={{ color: palette.textMuted }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        className={`rounded-2xl border px-4 text-sm ${multiline ? "min-h-24 py-3" : "h-12"}`}
        style={{
          color: palette.text,
          backgroundColor: palette.elevated,
          borderColor: palette.line,
          textAlignVertical: multiline ? "top" : "center"
        }}
      />
    </View>
  );
}

function BackButton() {
  const router = useRouter();
  const { palette } = useAppTheme();
  return (
    <Pressable onPress={() => router.back()} className="mb-3 mt-2 flex-row items-center">
      <LucideIcon name="ChevronLeft" color={palette.text} />
      <Text className="ml-1 text-base font-semibold" style={{ color: palette.text }}>
        设备信息
      </Text>
    </Pressable>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { palette } = useAppTheme();
  return (
    <View className={`flex-row justify-between py-2.5 ${last ? "" : "border-b"}`} style={{ borderColor: palette.line }}>
      <Text className="mr-4 text-sm" style={{ color: palette.textMuted }}>
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-medium" style={{ color: palette.text }}>
        {value}
      </Text>
    </View>
  );
}
