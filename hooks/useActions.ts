import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { CommandReplayRequest, ConnectionTestRequest, DeviceActionRequest } from "@/services/apiTypes";
import { queryKeys } from "@/services/queryKeys";
import { useAppStore } from "@/store/useAppStore";

export function useDeviceActionMutation(deviceId?: string) {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: DeviceActionRequest) => apiClient.runDeviceAction(request, apiConfig),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
      if (deviceId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.device(deviceId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLogs(deviceId) });
      }
    }
  });
}

export function useReplayCommandMutation(commandId?: string) {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: CommandReplayRequest) => apiClient.replayCommand(request, apiConfig),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.commandDashboard });
      if (commandId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.command(commandId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.commandLogs(commandId) });
      }
    }
  });
}

export function useConnectionTestMutation() {
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: ConnectionTestRequest) => apiClient.testConnection(request, apiConfig)
  });
}
