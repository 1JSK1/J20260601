import * as Dialog from "@rn-primitives/dialog";
import { Text, View } from "react-native";
import { useAppTheme } from "@/theme/AppTheme";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  danger,
  onOpenChange,
  onConfirm
}: Props) {
  const { palette } = useAppTheme();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="absolute inset-0 bg-black/60" />
        <Dialog.Content
          className="absolute bottom-0 left-0 right-0 rounded-t-[28px] border p-5"
          style={{ backgroundColor: palette.panel, borderColor: palette.line }}
        >
          <Dialog.Title className="text-lg font-semibold" style={{ color: palette.text }}>{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6" style={{ color: palette.textSoft }}>{description}</Dialog.Description>
          <View className="mt-5 flex-row gap-3">
            <Dialog.Close className="flex-1 rounded-2xl border px-4 py-3" style={{ backgroundColor: palette.surface, borderColor: palette.line }}>
              <Text className="text-center font-semibold" style={{ color: palette.text }}>{cancelText}</Text>
            </Dialog.Close>
            <Dialog.Close
              onPress={onConfirm}
              className="flex-1 rounded-2xl px-4 py-3"
              style={{ backgroundColor: danger ? palette.danger : palette.primary }}
            >
              <Text className="text-center font-semibold text-white">{confirmText}</Text>
            </Dialog.Close>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
