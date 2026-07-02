import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { queryKeys } from "@/services/queryKeys";

export function useSettingGroupsQuery() {
  return useQuery({
    queryKey: queryKeys.settingGroups,
    queryFn: mockApi.getSettingGroups
  });
}
