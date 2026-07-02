import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiConfigApi } from "@/services/apiConfigApi";
import { useAppStore } from "@/store/useAppStore";

const userApiConfigKey = (userId?: string) => ["user-api-config", userId] as const;

export function useUserApiConfigQuery() {
  const authUser = useAppStore((state) => state.authUser);
  const apiConfig = useAppStore((state) => state.apiConfig);
  return useQuery({
    queryKey: userApiConfigKey(authUser?.id),
    queryFn: () => apiConfigApi.get(apiConfig),
    enabled: Boolean(authUser && apiConfig.sessionId)
  });
}

export function useSaveUserApiConfigMutation() {
  const queryClient = useQueryClient();
  const authUser = useAppStore((state) => state.authUser);
  const apiConfig = useAppStore((state) => state.apiConfig);
  const updateApiConfig = useAppStore((state) => state.updateApiConfig);
  return useMutation({
    mutationFn: async (backendBaseUrl: string) => {
      if (!authUser || !apiConfig.sessionId) {
        return {
          backendBaseUrl,
          updatedAt: new Date().toISOString()
        };
      }
      return apiConfigApi.update(apiConfig, backendBaseUrl);
    },
    onSuccess: (value) => {
      queryClient.setQueryData(userApiConfigKey(authUser?.id), value);
      updateApiConfig({ baseUrl: value.backendBaseUrl });
    }
  });
}
