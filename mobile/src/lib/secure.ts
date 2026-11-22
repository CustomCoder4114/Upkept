/** Login tokens live in the phone's secure storage (Keychain / Keystore), never AsyncStorage. */
import type { TokenStore, Tokens } from "@upkept/api-client";
import * as SecureStore from "expo-secure-store";

const KEY = "upkept.tokens";

export const secureTokenStore: TokenStore = {
  async get() {
    const raw = await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  },
  async set(tokens) {
    if (tokens) await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    else await SecureStore.deleteItemAsync(KEY);
  },
};

export async function getSecret(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function setSecret(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
