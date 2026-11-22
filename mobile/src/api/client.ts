import { createApi } from "@upkept/api-client";
import { router } from "expo-router";

import { secureTokenStore } from "../lib/secure";

/** Set EXPO_PUBLIC_API_URL in mobile/.env (e.g. http://192.168.1.20:8000 when testing on a phone). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export const api = createApi({
  baseUrl: API_URL,
  tokens: secureTokenStore,
  onSignedOut: () => router.replace("/sign-in"),
});
