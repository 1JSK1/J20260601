import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function FilterTabs<T extends string>({ options, value, onChange }: Props<T>) {
  const { palette } = useAppTheme();

  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="rounded-full border px-4 py-2.5"
            style={{
              backgroundColor: active ? palette.primary : palette.panel,
              borderColor: active ? palette.primary : palette.line
            }}
          >
            <Text className="text-xs font-semibold" style={{ color: active ? palette.primaryText : palette.textSoft }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
