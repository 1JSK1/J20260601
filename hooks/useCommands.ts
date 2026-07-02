import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { backendApi, TextCommandRequest } from "@/services/backendApi";
import { mockApi } from "@/services/mockApi";
import { queryKeys } from "@/services/queryKeys";
import { useAppStore } from "@/store/useAppStore";

export function useCommandDashboardQuery() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);

  return useQuery({
    queryKey: [...queryKeys.commandDashboard, authUser?.id, apiConfig.mode, apiConfig.baseUrl],
    queryFn: () => (apiConfig.mode === "http" ? backendApi.getCommandDashboard(apiConfig) : mockApi.getCommandDashboard()),
    enabled: Boolean(authUser && apiConfig.sessionId)
  });
}

export function useCommandQuery(id?: string) {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);

  return useQuery({
    queryKey: [...queryKeys.command(id ?? ""), authUser?.id, apiConfig.mode, apiConfig.baseUrl],
    queryFn: () => (apiConfig.mode === "http" ? backendApi.getCommand(apiConfig, id ?? "") : mockApi.getCommand(id ?? "")),
    enabled: Boolean(id && authUser && apiConfig.sessionId)
  });
}

export function useCommandLogsQuery(id?: string) {
  return useQuery({
    queryKey: queryKeys.commandLogs(id ?? ""),
    queryFn: () => mockApi.getCommandLogs(),
    enabled: Boolean(id)
  });
}

export function useSendTextCommandMutation() {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: TextCommandRequest) => backendApi.runTextCommand(apiConfig, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.commandDashboard });
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    }
  });
}
