import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ApiMode, ApiRuntimeConfig } from "@/services/apiAdapter";
import type { AppThemeMode } from "@/theme/AppTheme";
import type { DeviceStatus } from "@/data/types";
import type { AuthUser } from "@/services/authApi";
import { authStorage } from "@/services/authStorage";

export type DeviceFilter = "all" | DeviceStatus;

type AppStore = {
  themeMode: AppThemeMode;
  deviceSearch: string;
  deviceFilter: DeviceFilter;
  commandDraft: string;
  commandTargetDeviceIds: string[];
  lastActionMessage?: string;
  apiConfig: ApiRuntimeConfig;
  authUser?: AuthUser;
  authSessionId?: string;
  setThemeMode: (mode: AppThemeMode) => void;
  toggleThemeMode: () => void;
  setDeviceSearch: (value: string) => void;
  setDeviceFilter: (value: DeviceFilter) => void;
  setCommandDraft: (value: string) => void;
  setCommandTargetDeviceIds: (value: string[]) => void;
  setLastActionMessage: (value?: string) => void;
  setApiMode: (mode: ApiMode) => void;
  updateApiConfig: (patch: Partial<ApiRuntimeConfig>) => void;
  setAuthSession: (user: AuthUser, sessionId: string) => void;
  clearAuthSession: () => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      themeMode: "dark",
      deviceSearch: "",
      deviceFilter: "all",
      commandDraft: "",
      commandTargetDeviceIds: [],
      lastActionMessage: undefined,
      authUser: undefined,
      authSessionId: undefined,
      apiConfig: {
        mode: "http",
        baseUrl: "http://127.0.0.1:8008",
        apiKey: "",
        model: "Command-7B",
        timeoutMs: 8000,
        maxRetries: 2,
        userId: "user-local-default"
      },
      setThemeMode: (themeMode) => set({ themeMode }),
      toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === "dark" ? "light" : "dark" })),
      setDeviceSearch: (deviceSearch) => set({ deviceSearch }),
      setDeviceFilter: (deviceFilter) => set({ deviceFilter }),
      setCommandDraft: (commandDraft) => set({ commandDraft }),
      setCommandTargetDeviceIds: (commandTargetDeviceIds) => set({ commandTargetDeviceIds }),
      setLastActionMessage: (lastActionMessage) => set({ lastActionMessage }),
      setApiMode: (mode) => set((state) => ({ apiConfig: { ...state.apiConfig, mode } })),
      updateApiConfig: (patch) => set((state) => ({ apiConfig: { ...state.apiConfig, ...patch } })),
      setAuthSession: (authUser, sessionId) =>
        set((state) => ({
          authUser,
          authSessionId: sessionId,
          commandTargetDeviceIds: [],
          apiConfig: { ...state.apiConfig, userId: authUser.id, sessionId }
        })),
      clearAuthSession: () =>
        set((state) => ({
          authUser: undefined,
          authSessionId: undefined,
          commandTargetDeviceIds: [],
          apiConfig: { ...state.apiConfig, userId: "user-local-default", sessionId: undefined }
        }))
    }),
    {
      name: "my-app-auth-session",
      storage: createJSONStorage(() => authStorage),
      partialize: (state) => ({
        authUser: state.authUser,
        authSessionId: state.authSessionId,
        apiConfig: {
          mode: state.apiConfig.mode,
          baseUrl: state.apiConfig.baseUrl,
          apiKey: "",
          model: state.apiConfig.model,
          timeoutMs: state.apiConfig.timeoutMs,
          maxRetries: state.apiConfig.maxRetries,
          userId: state.authUser?.id ?? "user-local-default",
          sessionId: state.authSessionId
        }
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Pick<AppStore, "authUser" | "authSessionId"> & {
          apiConfig?: Partial<ApiRuntimeConfig>;
        };
        return {
          ...currentState,
          ...persisted,
          apiConfig: {
            ...currentState.apiConfig,
            ...persisted.apiConfig,
            apiKey: "",
            userId: persisted.authUser?.id ?? "user-local-default",
            sessionId: persisted.authSessionId
          }
        };
      }
    }
  )
);
