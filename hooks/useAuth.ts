import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/services/authApi";
import { ApiError } from "@/services/apiTypes";
import { useAppStore } from "@/store/useAppStore";

function useRefreshUserData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries();
  };
}

export function useLoginMutation() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const refreshUserData = useRefreshUserData();

  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => authApi.login(apiConfig, username, password),
    onSuccess: (response) => {
      setAuthSession(response.user, response.sessionId);
      refreshUserData();
    }
  });
}

export function useRegisterMutation() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const refreshUserData = useRefreshUserData();

  return useMutation({
    mutationFn: ({ username, password, displayName }: { username: string; password: string; displayName: string }) =>
      authApi.register(apiConfig, username, password, displayName),
    onSuccess: (response) => {
      setAuthSession(response.user, response.sessionId);
      refreshUserData();
    }
  });
}

export function useLogoutMutation() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const clearAuthSession = useAppStore((state) => state.clearAuthSession);
  const refreshUserData = useRefreshUserData();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout(apiConfig);
      } finally {
        clearAuthSession();
        refreshUserData();
      }
    }
  });
}

export function useAuthSessionValidation() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const clearAuthSession = useAppStore((state) => state.clearAuthSession);

  useEffect(() => {
    if (!apiConfig.sessionId) return;

    let active = true;
    authApi
      .getMe(apiConfig)
      .then((user) => {
        if (active && apiConfig.sessionId) {
          setAuthSession(user, apiConfig.sessionId);
        }
      })
      .catch((error) => {
        if (active && error instanceof ApiError && error.code === "UNAUTHORIZED") {
          clearAuthSession();
        }
      });

    return () => {
      active = false;
    };
  }, [apiConfig.baseUrl, apiConfig.sessionId, clearAuthSession, setAuthSession]);
}
