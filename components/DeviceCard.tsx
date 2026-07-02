import { Pressable, Text, View } from "react-native";
import { Device } from "@/data/types";
import { LucideIcon } from "./Icon";
import { StatusBadge } from "./StatusBadge";
import { useAppTheme } from "@/theme/AppTheme";

const typeIcon: Record<string, string> = {
  电脑: "Monitor",
  主机: "Server",
  手机: "Smartphone",
  网关: "Router",
  音响: "Speaker",
  小车: "Car",
  盒子: "HardDrive"
};

type Props = {
  device: Device;
  onPress: () => void;
};

export function DeviceCard({ device, onPress }: Props) {
  const { palette } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[26px] border p-4 active:opacity-80"
      style={{ backgroundColor: palette.panel, borderColor: palette.line }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 flex-row items-start">
          <View className="mr-3 rounded-2xl p-3" style={{ backgroundColor: `${palette.primary}22` }}>
            <LucideIcon name={typeIcon[device.type] ?? "Monitor"} color={palette.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-[16px] font-bold" style={{ color: palette.text }}>
              {device.name}
            </Text>
            <Text className="mt-1 text-xs" style={{ color: palette.textSoft }}>
              {device.group}
            </Text>
          </View>
        </View>
        <StatusBadge status={device.status} />
      </View>

      <View className="mt-4 rounded-[18px] p-4" style={{ backgroundColor: palette.elevated }}>
        <Text className="text-xs" style={{ color: palette.textMuted }}>
          当前任务
        </Text>
        <Text className="mt-1 text-sm font-semibold" style={{ color: palette.text }}>
          {device.currentTask}
        </Text>
        <View className="mt-4 flex-row items-end justify-between">
          <View>
            <Text className="text-xs" style={{ color: palette.textMuted }}>设备编号</Text>
            <Text className="mt-1 text-xs font-semibold" style={{ color: palette.text }}>{device.serial}</Text>
          </View>
          <View className="items-end">
            <Text className="text-xs" style={{ color: palette.textMuted }}>IP 地址</Text>
            <Text className="mt-1 text-xs font-semibold" style={{ color: palette.text }}>{device.ip}</Text>
          </View>
        </View>
      </View>

      <Text className="mt-3 text-xs" style={{ color: palette.textMuted }}>
        {device.type} · {device.system} · 心跳 {device.lastHeartbeat}
      </Text>
    </Pressable>
  );
}
