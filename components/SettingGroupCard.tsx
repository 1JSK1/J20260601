import { Pressable, Text, View } from "react-native";
import { SettingGroup } from "@/data/types";
import { LucideIcon } from "./Icon";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  group: SettingGroup;
  onPressItem?: (route?: string) => void;
};

export function SettingGroupCard({ group, onPressItem }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="rounded-[26px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <Text className="text-base font-bold" style={{ color: palette.text }}>{group.title}</Text>
      <Text className="mb-3 mt-1 text-xs leading-5" style={{ color: palette.textMuted }}>
        所有值均为 UI 演示数据，真实读写与测试将在下一阶段接入。
      </Text>
      {group.items.map((item, index) => (
        <Pressable
          key={item.label}
          disabled={item.disabled}
          onPress={() => onPressItem?.(item.route)}
          className={`mb-3 flex-row items-center rounded-[18px] p-3 ${index === group.items.length - 1 ? "mb-0" : ""} ${item.disabled ? "opacity-50" : ""}`}
          style={{ backgroundColor: palette.elevated }}
        >
          <View className="mr-3 rounded-2xl p-3" style={{ backgroundColor: `${palette.primary}18` }}>
            <LucideIcon name={item.icon} size={18} color={item.danger ? palette.danger : palette.primary} />
          </View>
          <Text className="flex-1 text-[15px] font-medium" style={{ color: item.danger ? palette.danger : palette.text }}>
            {item.label}
          </Text>
          {item.value ? <Text className="mr-2 max-w-[130px] text-right text-xs" style={{ color: palette.textSoft }}>{item.value}</Text> : null}
          <LucideIcon name="ChevronRight" size={18} color={palette.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}
