import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LockOverlay } from "../src/components/LockOverlay";
import { canUseBiometrics } from "../src/lib/biometrics";
import { secureTokenStore } from "../src/lib/secure";
import { useApp } from "../src/store";
import { colors } from "../src/theme/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const LOCK_AFTER_MS = 60_000; // lock again after a minute in the background

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold,
  });
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [lockEnabled, setLockEnabled] = useState(false);
  const { locked, setLocked } = useApp();
  const segments = useSegments();
  const backgroundedAt = useRef<number | null>(null);

  // Is there a saved login? Can this phone lock with biometrics/PIN?
  useEffect(() => {
    secureTokenStore.get().then((t) => setSignedIn(!!t));
    canUseBiometrics().then((ok) => {
      setLockEnabled(ok);
      if (!ok) setLocked(false);
    });
  }, [setLocked]);

  // Re-check login whenever the route changes (sign-in / sign-out flows).
  useEffect(() => {
    secureTokenStore.get().then((t) => setSignedIn(!!t));
  }, [segments]);

  // Send signed-out users to sign-in, signed-in users away from it.
  useEffect(() => {
    if (signedIn === null || !fontsLoaded) return;
    const inAuth = segments[0] === "(auth)";
    if (!signedIn && !inAuth) router.replace("/sign-in");
    else if (signedIn && segments[0] === undefined) router.replace("/(tabs)");
    SplashScreen.hideAsync();
  }, [signedIn, fontsLoaded, segments]);

  // Lock when the app has been in the background for a while.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") backgroundedAt.current = Date.now();
      if (state === "active" && backgroundedAt.current && Date.now() - backgroundedAt.current > LOCK_AFTER_MS) {
        setLocked(true);
      }
    });
    return () => sub.remove();
  }, [setLocked]);

  // Tapping a reminder opens the item.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === "home") router.push("/home");
      else if (typeof data?.itemId === "string") router.push(`/item/${data.itemId}`);
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded || signedIn === null) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="add/scan" options={{ presentation: "fullScreenModal" }} />
            <Stack.Screen name="add/confirm" options={{ presentation: "fullScreenModal" }} />
            <Stack.Screen name="home/camera" options={{ presentation: "fullScreenModal" }} />
          </Stack>
          {signedIn && lockEnabled && locked ? <LockOverlay /> : null}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
