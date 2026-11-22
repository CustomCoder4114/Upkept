import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert, Text, View } from "react-native";

import { api } from "../src/api/client";
import { useMe } from "../src/api/hooks";
import { Button, Card, CircleButton, Screen } from "../src/components/ui";
import { enableNotifications } from "../src/lib/notifications";
import { wipeOffline } from "../src/lib/offline";
import { space } from "../src/theme/spacing";
import { type } from "../src/theme/typography";

export default function SettingsScreen() {
  const me = useMe();
  const qc = useQueryClient();

  const signOut = async () => {
    await wipeOffline(); // offline copies don't stay on a signed-out phone
    await api.auth.logout();
    qc.clear();
    router.replace("/sign-in");
  };

  const deleteAccount = () =>
    Alert.alert("Delete your account?", "This permanently deletes every item, document and reminder. It can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete everything", style: "destructive",
        onPress: async () => {
          await api.auth.deleteAccount();
          await wipeOffline();
          qc.clear();
          router.replace("/sign-up");
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { marginLeft: space.md }]}>Settings</Text>
      </View>
      {me.data ? (
        <Card style={{ marginBottom: space.lg }}>
          <Text style={type.h3}>{me.data.name}</Text>
          <Text style={type.small}>{me.data.email} · {me.data.plan === "free" ? "Free plan" : "Premium"}</Text>
        </Card>
      ) : null}
      <Button title="Turn on reminders / send a test" variant="outline"
        onPress={async () => { if (await enableNotifications()) await api.reminders.sendTest(); }} />
      <Button title="Sign out" variant="outline" onPress={signOut} style={{ marginTop: space.sm }} />
      <Button title="Delete my account and data" variant="outline" onPress={deleteAccount} style={{ marginTop: space.xl }} />
    </Screen>
  );
}
