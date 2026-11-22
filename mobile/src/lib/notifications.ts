/** Push notifications: permission, Android channel, and registering this phone with the backend. */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "../api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function hasPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/** Asked during onboarding, after explaining why ("So we can warn you before anything expires"). */
export async function enableNotifications(): Promise<boolean> {
  if (!Device.isDevice) return false; // simulators can't get push tokens

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let granted = await hasPermission();
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).status === "granted";
  if (!granted) return false;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.reminders.registerDevice(token, Platform.OS === "ios" ? "ios" : "android");
  return true;
}
