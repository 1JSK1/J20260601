import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "muted" | "danger";
  note?: string;
};

const toneClass = {
  default: "text-white",
  success: "text-success",
  muted: "text-[#A6B2C2]",
  danger: "text-danger"
};

const dotClass = {
  default: "bg-primary",
  success: "bg-success",
  muted: "bg-[#9AA4B2]",
  danger: "bg-danger"
};

const noteClass = {
  default: "text-primary",
  success: "text-success",
  muted: "text-[#A6B2C2]",
  danger: "text-danger"
};

export function StatCard({ label, value, tone = "default", note }: Props) {
  const { palette } = useAppTheme();
  const valueColor =
    tone === "success" ? palette.success : tone === "danger" ? palette.danger : tone === "muted" ? palette.textSoft : palette.text;
  const noteColor = tone === "success" ? palette.success : tone === "danger" ? palette.danger : tone === "muted" ? palette.textSoft : palette.primary;
  const dotColor = tone === "success" ? palette.success : tone === "danger" ? palette.danger : tone === "muted" ? palette.textMuted : palette.primary;

  return (
    <View className="flex-1 rounded-[22px] border p-4" style={{ backgroundColor: palette.panel, borderColor: palette.line }}>
      <View className="mb-4 flex-row items-center">
        <View className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <Text className="text-xs" style={{ color: palette.textSoft }}>
          {label}
        </Text>
      </View>
      <Text className="text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </Text>
      {note ? (
        <Text className="mt-3 text-xs leading-4" style={{ color: noteColor }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
