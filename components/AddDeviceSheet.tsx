import * as Dialog from "@rn-primitives/dialog";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LucideIcon } from "./Icon";
import { useAddManualDeviceMutation } from "@/hooks/useDevices";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Feedback = {
  tone: "success" | "danger" | "warning";
  message: string;
} | null;

export function AddDeviceSheet({ open, onOpenChange }: Props) {
  const { palette } = useAppTheme();
  const [deviceName, setDeviceName] = useState("");
  const [manualIp, setManualIp] = useState("");
  const [manualPort, setManualPort] = useState("7821");
  const [groupName, setGroupName] = useState("默认分组");
  const [note, setNote] = useState("");
  const [pairToken, setPairToken] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const addManualDeviceMutation = useAddManualDeviceMutation();

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setFeedback(null);
      addManualDeviceMutation.reset();
    }
  }

  function handleManualAdd() {
    const host = manualIp.trim();
    const port = Number(manualPort.trim());
    const pairingToken = pairToken.trim();
    const name = deviceName.trim();

    if (!name || !host || !Number.isInteger(port) || port < 1 || port > 65535 || !pairingToken) {
      setFeedback({ tone: "danger", message: "请完整填写设备名称、Agent 地址、端口和配对 Token。" });
      return;
    }

    setFeedback(null);
    addManualDeviceMutation.mutate(
      {
        name,
        host,
        port,
        pairingToken,
        groupName: groupName.trim() || "默认分组",
        note: note.trim()
      },
      {
        onSuccess: (response) => {
          setFeedback({
            tone: response.test.ok ? "success" : "warning",
            message: response.test.ok
              ? `已添加 ${response.device.name}，连接测试成功。`
              : `设备已登记，但连接测试未通过：${response.test.message}`
          });
        },
        onError: (error) => {
          setFeedback({
            tone: "danger",
            message: error instanceof Error ? error.message : "添加设备失败，请确认后端服务是否运行。"
          });
        }
      }
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="absolute inset-0 bg-black/60" />
        <Dialog.Content
          className="absolute bottom-0 left-0 right-0 max-h-[88%] rounded-t-[30px] border p-5"
          style={{ backgroundColor: palette.panel, borderColor: palette.line }}
        >
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Dialog.Title className="text-xl font-bold" style={{ color: palette.text }}>
                添加局域网设备
              </Dialog.Title>
            </View>
            <Dialog.Close className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: palette.surface }}>
              <LucideIcon name="X" color={palette.text} size={18} />
            </Dialog.Close>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ManualAddForm
              deviceName={deviceName}
              ip={manualIp}
              port={manualPort}
              groupName={groupName}
              note={note}
              pairToken={pairToken}
              feedback={feedback}
              pending={addManualDeviceMutation.isPending}
              onChangeDeviceName={setDeviceName}
              onChangeIp={setManualIp}
              onChangePort={setManualPort}
              onChangeGroupName={setGroupName}
              onChangeNote={setNote}
              onChangePairToken={setPairToken}
              onSubmit={handleManualAdd}
            />
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ManualAddForm({
  deviceName,
  ip,
  port,
  groupName,
  note,
  pairToken,
  feedback,
  pending,
  onChangeDeviceName,
  onChangeIp,
  onChangePort,
  onChangeGroupName,
  onChangeNote,
  onChangePairToken,
  onSubmit
}: {
  deviceName: string;
  ip: string;
  port: string;
  groupName: string;
  note: string;
  pairToken: string;
  feedback: Feedback;
  pending: boolean;
  onChangeDeviceName: (value: string) => void;
  onChangeIp: (value: string) => void;
  onChangePort: (value: string) => void;
  onChangeGroupName: (value: string) => void;
  onChangeNote: (value: string) => void;
  onChangePairToken: (value: string) => void;
  onSubmit: () => void;
}) {
  const { palette } = useAppTheme();
  const feedbackColor =
    feedback?.tone === "success" ? palette.success : feedback?.tone === "warning" ? palette.warning : palette.danger;

  return (
    <View>
      <FormSectionTitle title="必填信息" />
      <View className="gap-3">
        <ManualInput
          required
          label="设备名称"
          value={deviceName}
          placeholder="例如 办公室电脑"
          onChangeText={onChangeDeviceName}
        />
        <ManualInput
          required
          label="IP 地址或主机名"
          value={ip}
          placeholder="例如 192.168.1.21"
          onChangeText={onChangeIp}
          keyboardType="url"
        />
        <ManualInput
          required
          label="Agent 端口"
          value={port}
          placeholder="例如 7821"
          onChangeText={onChangePort}
          keyboardType="number-pad"
        />
        <ManualInput
          required
          label="配对 Token"
          value={pairToken}
          placeholder="请输入 Agent 配对 Token"
          onChangeText={onChangePairToken}
          secureTextEntry
        />
      </View>

      <FormSectionTitle title="选填信息" />
      <View className="gap-3">
        <ManualInput
          label="设备分组"
          value={groupName}
          placeholder="默认分组"
          onChangeText={onChangeGroupName}
        />
        <ManualInput
          label="备注信息"
          value={note}
          placeholder="填写设备用途或位置"
          onChangeText={onChangeNote}
          multiline
        />
      </View>

      {feedback ? (
        <View className="mt-4 rounded-[18px] px-4 py-3" style={{ backgroundColor: `${feedbackColor}18` }}>
          <Text className="text-xs font-semibold leading-5" style={{ color: feedbackColor }}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <Pressable
        disabled={pending}
        onPress={onSubmit}
        className={`mt-4 flex-row items-center justify-center rounded-full px-4 py-3.5 active:opacity-80 ${pending ? "opacity-60" : ""}`}
        style={{ backgroundColor: palette.primary }}
      >
        <LucideIcon name={pending ? "LoaderCircle" : "Wifi"} color={palette.primaryText} size={18} />
        <Text className="ml-2 text-sm font-semibold" style={{ color: palette.primaryText }}>
          {pending ? "正在添加并测试" : "添加并测试连接"}
        </Text>
      </Pressable>
    </View>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  const { palette } = useAppTheme();
  return (
    <View className="mb-3 mt-2">
      <Text className="text-sm font-bold" style={{ color: palette.text }}>
        {title}
      </Text>
    </View>
  );
}

function ManualInput({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
  required,
  secureTextEntry,
  multiline
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "url";
  onChangeText: (value: string) => void;
  required?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  const { palette } = useAppTheme();

  return (
    <View>
      <View className="mb-2 flex-row items-center">
        <Text className="text-xs font-semibold" style={{ color: palette.textSoft }}>
          {label}
        </Text>
        <Text className="ml-1 text-xs font-semibold" style={{ color: required ? palette.danger : palette.textMuted }}>
          {required ? "*" : "选填"}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        className={`rounded-2xl border px-4 text-base ${multiline ? "min-h-24 py-3" : "py-3"}`}
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
