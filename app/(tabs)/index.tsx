import { useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ActionButton } from "@/components/ActionButton";
import { AddDeviceSheet } from "@/components/AddDeviceSheet";
import { DeviceCard } from "@/components/DeviceCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterTabs } from "@/components/FilterTabs";
import { InlineState } from "@/components/InlineState";
import { PageContainer } from "@/components/PageContainer";
import { SearchField } from "@/components/SearchField";
import { StatCard } from "@/components/StatCard";
import { useDevicesQuery } from "@/hooks/useDevices";
import { DeviceFilter, useAppStore } from "@/store/useAppStore";
import { useAppTheme } from "@/theme/AppTheme";

const filters: { label: string; value: DeviceFilter }[] = [
  { label: "全部", value: "all" },
  { label: "在线", value: "online" },
  { label: "离线", value: "offline" },
  { label: "异常", value: "warning" }
];

export default function DevicesScreen() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const query = useAppStore((state) => state.deviceSearch);
  const setQuery = useAppStore((state) => state.setDeviceSearch);
  const filter = useAppStore((state) => state.deviceFilter);
  const setFilter = useAppStore((state) => state.setDeviceFilter);
  const authUser = useAppStore((state) => state.authUser);
  const devicesQuery = useDevicesQuery();
  const devices = devicesQuery.data?.devices ?? [];

  const stats = devicesQuery.data?.stats ?? { total: 0, online: 0, offline: 0, warning: 0 };

  const filteredDevices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return devices.filter((device) => {
      const matchesFilter = filter === "all" || device.status === filter;
      const searchable = [
        device.name,
        device.serial,
        device.ip,
        device.system,
        device.type,
        device.group,
        device.currentTask
      ]
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!normalized || searchable.includes(normalized));
    });
  }, [devices, filter, query]);

  if (!authUser) {
    return (
      <PageContainer>
        <View className="flex-1 justify-center">
          <InlineState title="请先登录账号" description="登录后才能查看、添加和控制属于该账号的设备。" />
          <View className="mt-4">
            <ActionButton label="前往登录" icon="LogIn" variant="primary" onPress={() => router.push("/settings/account")} />
          </View>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <FlatList
        data={filteredDevices}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-6"
        ListHeaderComponent={
          <View>
            <View className="mb-4 mt-2 flex-row gap-3">
              <StatCard label="设备总数" value={stats.total} />
              <StatCard label="在线数量" value={stats.online} tone="success" />
              <StatCard label="离线数量" value={stats.offline} tone="muted" />
            </View>
            {devicesQuery.isLoading ? (
              <View className="mb-4">
                <InlineState title="正在加载设备" description="" />
              </View>
            ) : null}
            {devicesQuery.isError ? (
              <View className="mb-4">
                <InlineState title="设备数据加载失败" description={devicesQuery.error.message} />
              </View>
            ) : null}
            <ActionButton
              label="添加设备"
              icon="Plus"
              variant="primary"
              onPress={() => setAddDeviceOpen(true)}
            />
            <View className="my-5">
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="搜索名称、编号、IP、系统或类型"
              />
            </View>
            <FilterTabs options={filters} value={filter} onChange={setFilter} />
            <View className="mb-3 mt-6 flex-row items-center justify-between">
              <Text className="text-base font-bold" style={{ color: palette.text }}>
                设备列表
              </Text>
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: palette.panel }}>
                <Text className="text-xs font-semibold" style={{ color: palette.text }}>
                  {filteredDevices.length} 台
                </Text>
              </View>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <EmptyState title="没有匹配设备" description="" />
        }
        renderItem={({ item }) => (
          <DeviceCard device={item} onPress={() => router.push(`/device/${item.id}`)} />
        )}
      />
      <AddDeviceSheet open={addDeviceOpen} onOpenChange={setAddDeviceOpen} />
    </PageContainer>
  );
}
