import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";

export type AppThemeMode = "dark" | "light";

export const palettes = {
  dark: {
    mode: "dark" as const,
    background: "#090A0E",
    surface: "#11131A",
    panel: "#171A22",
    elevated: "#0F1117",
    line: "#252A35",
    text: "#FFFFFF",
    textMuted: "#8F9AAB",
    textSoft: "#A1ACBC",
    primary: "#387FE6",
    primaryText: "#FFFFFF",
    success: "#5B9761",
    danger: "#EF4444",
    warning: "#F59E0B"
  },
  light: {
    mode: "light" as const,
    background: "#F3F6FB",
    surface: "#EEF2F8",
    panel: "#FFFFFF",
    elevated: "#F6F8FC",
    line: "#E2E8F0",
    text: "#182235",
    textMuted: "#687386",
    textSoft: "#4E5A6D",
    primary: "#3F70D0",
    primaryText: "#FFFFFF",
    success: "#5D9E59",
    danger: "#C93A45",
    warning: "#D88713"
  }
};

type AppThemeContextValue = {
  mode: AppThemeMode;
  palette: (typeof palettes)[AppThemeMode];
  setMode: (mode: AppThemeMode) => void;
  toggleMode: () => void;
  isDark: boolean;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const mode = useAppStore((state) => state.themeMode);
  const setMode = useAppStore((state) => state.setThemeMode);
  const toggleThemeMode = useAppStore((state) => state.toggleThemeMode);
  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      palette: palettes[mode],
      setMode,
      toggleMode: toggleThemeMode,
      isDark: mode === "dark"
    }),
    [mode, setMode, toggleThemeMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used inside AppThemeProvider");
  }
  return value;
}
