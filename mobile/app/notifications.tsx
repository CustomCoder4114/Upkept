/** The bell: reminders that went out, with Snooze / Already done / Not renewing. */
import { router } from "expo-router";
import { Text, View } from "react-native";

import { useReminderAction, useReminders } from "../src/api/hooks";
import { Button, Card, CircleButton, ErrorNote, Loading, Screen } from "../src/components/ui";
import { space } from "../src/theme/spacing";
import { type } from "../src/theme/typography";

export default function NotificationsScreen() {
  const reminders = useReminders();
  const act = useReminderAction();

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { marginLeft: space.md }]}>Reminders</Text>
      </View>
      {reminders.isLoading ? <Loading /> : reminders.error ? <ErrorNote error={reminders.error} /> : null}
      {reminders.data?.length === 0 ? <Text style={type.body}>You're all caught up.</Text> : null}
      {reminders.data?.map((r) => (
        <Card key={r.id} style={{ marginBottom: space.md }}>
          <Text style={type.h3} onPress={() => router.push(`/item/${r.item_id}`)}>{r.item_title}</Text>
          <Text style={type.small}>{r.days_before} days before it ends{r.attempt ? " · reminder again" : ""}</Text>
          <Button title="Open the steps" onPress={() => router.push(`/item/${r.item_id}`)} style={{ marginTop: space.md }} />
          <View style={{ flexDirection: "row", marginTop: space.sm }}>
            <Button title="Snooze 3 days" variant="outline" style={{ flex: 1, marginRight: 6, height: 44 }}
              onPress={() => act.mutate({ id: r.id, action: "snooze", days: 3 })} />
            <Button title="Already done" variant="outline" style={{ flex: 1, height: 44 }}
              onPress={() => act.mutate({ id: r.id, action: "done" }, { onSuccess: () =>
                router.push({ pathname: "/add/scan", params: { renew: r.item_id } }) })} />
          </View>
          <Button title="I'm not renewing this" variant="outline" style={{ marginTop: 6, height: 44 }}
            onPress={() => act.mutate({ id: r.id, action: "not_renewing" })} />
        </Card>
      ))}
    </Screen>
  );
}
