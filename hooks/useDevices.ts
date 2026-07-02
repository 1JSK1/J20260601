import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  backendApi,
  AddManualDeviceRequest,
  DeviceQuickActionRequest,
  UpdateDeviceRequest
} from "@/services/backendApi";
import { mockApi } from "@/services/mockApi";
import { queryKeys } from "@/services/queryKeys";
import { useAppStore } from "@/store/useAppStore";

export function useDevicesQuery() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);

  return useQuery({
    queryKey: [...queryKeys.devices, authUser?.id, apiConfig.mode, apiConfig.baseUrl],
    queryFn: () => (apiConfig.mode === "http" ? backendApi.getDevices(apiConfig) : mockApi.getDevices()),
    enabled: Boolean(authUser && apiConfig.sessionId)
  });
}

export function useDeviceQuery(id?: string) {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);

  return useQuery({
    queryKey: [...queryKeys.device(id ?? ""), authUser?.id, apiConfig.mode, apiConfig.baseUrl],
    queryFn: () => (apiConfig.mode === "http" ? backendApi.getDevice(apiConfig, id ?? "") : mockApi.getDevice(id ?? "")),
    enabled: Boolean(id && authUser && apiConfig.sessionId)
  });
}

export function useDeviceLogsQuery(id?: string) {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);

  return useQuery({
    queryKey: [...queryKeys.deviceLogs(id ?? ""), authUser?.id, apiConfig.mode, apiConfig.baseUrl],
    queryFn: () => (apiConfig.mode === "http" ? backendApi.getDeviceLogs(apiConfig, id ?? "") : mockApi.getDeviceLogs()),
    enabled: Boolean(id && authUser && apiConfig.sessionId)
  });
}

export function useAddManualDeviceMutation() {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: AddManualDeviceRequest) => backendApi.addManualDevice(apiConfig, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
    }
  });
}

export function useDeviceQuickActionMutation(deviceId?: string) {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: DeviceQuickActionRequest) => backendApi.runQuickAction(apiConfig, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
      if (deviceId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.device(deviceId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLogs(deviceId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.commandDashboard });
      }
    }
  });
}

export function useUpdateDeviceMutation(deviceId?: string) {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);

  return useMutation({
    mutationFn: (request: UpdateDeviceRequest) => backendApi.updateDevice(apiConfig, request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
      if (deviceId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.device(deviceId) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.deviceLogs(deviceId) });
      }
    }
  });
}
