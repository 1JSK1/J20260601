import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

function getWebStorage() {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

export const authStorage: StateStorage = {
  async getItem(name) {
    if (Platform.OS === "web") {
      return getWebStorage()?.getItem(name) ?? null;
    }
    return SecureStore.getItemAsync(name);
  },

  async setItem(name, value) {
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(name, value);
      return;
    }
    await SecureStore.setItemAsync(name, value);
  },

  async removeItem(name) {
    if (Platform.OS === "web") {
      getWebStorage()?.removeItem(name);
      return;
    }
    await SecureStore.deleteItemAsync(name);
  }
};
