import { TextInput, View } from "react-native";
import { LucideIcon } from "./Icon";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: Props) {
  const { palette } = useAppTheme();

  return (
    <View className="flex-row items-center rounded-full border px-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <LucideIcon name="Search" size={18} color={palette.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        className="ml-2 h-12 flex-1 text-[15px]"
        style={{ color: palette.text }}
      />
    </View>
  );
}
