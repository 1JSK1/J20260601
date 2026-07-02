import { Pressable, Text } from "react-native";
import { LucideIcon } from "./Icon";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  label: string;
  icon: string;
  variant?: "primary" | "secondary" | "danger";
  onPress?: () => void;
  disabled?: boolean;
};

const variantClass = {
  primary: "border-primary bg-primary",
  secondary: "border-line bg-panel",
  danger: "border-danger bg-danger/15"
};

const textClass = {
  primary: "text-[#101826]",
  secondary: "text-[#D6E2F1]",
  danger: "text-danger"
};

export function ActionButton({ label, icon, variant = "secondary", onPress, disabled }: Props) {
  const { palette } = useAppTheme();
  const backgroundColor =
    variant === "primary" ? palette.primary : variant === "danger" ? `${palette.danger}22` : palette.panel;
  const borderColor = variant === "primary" ? palette.primary : variant === "danger" ? palette.danger : palette.line;
  const color = variant === "primary" ? palette.primaryText : variant === "danger" ? palette.danger : palette.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center rounded-full border px-4 py-3.5 active:opacity-80 ${disabled ? "opacity-50" : ""}`}
      style={{ backgroundColor, borderColor }}
    >
      <LucideIcon name={icon} size={18} color={color} />
      <Text className="ml-2 text-sm font-semibold" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
