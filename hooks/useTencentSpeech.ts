import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/queryKeys";
import { tencentSpeechApi, type TencentAsrConfigUpdate } from "@/services/tencentSpeechApi";
import { useAppStore } from "@/store/useAppStore";

export function useTencentSpeechConfigQuery() {
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);
  return useQuery({
    queryKey: queryKeys.tencentSpeechConfig(authUser?.id),
    queryFn: () => tencentSpeechApi.getConfig(apiConfig),
    enabled: Boolean(authUser && apiConfig.sessionId)
  });
}

export function useSaveTencentSpeechConfigMutation() {
  const queryClient = useQueryClient();
  const apiConfig = useAppStore((state) => state.apiConfig);
  const authUser = useAppStore((state) => state.authUser);
  return useMutation({
    mutationFn: (value: TencentAsrConfigUpdate) => tencentSpeechApi.updateConfig(apiConfig, value),
    onSuccess: (value) => {
      queryClient.setQueryData(queryKeys.tencentSpeechConfig(authUser?.id), value);
    }
  });
}
