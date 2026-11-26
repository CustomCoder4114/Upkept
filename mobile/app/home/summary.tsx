/** Design: Morning summary. Preview, where it shows on the timeline, and settings. */
import { router } from "expo-router";
import { Pressable, Switch, Text, View } from "react-native";

import { useHome, useUpdateMe } from "../../src/api/hooks";
import { Card, Chip, CircleButton, ErrorNote, Screen, SectionLabel } from "../../src/components/ui";
import { summaryText } from "../../src/lib/homeSummary";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const HOURS = [6, 7, 8, 9, 18];

export default function SummaryScreen() {
  const home = useHome();
  const update = useUpdateMe();
  const h = home.data;
  const preview = h ? summaryText(h.this_week) : null;
  const hour = h?.summary_hour ?? 7;
  const counts = h ? { Kitchen: h.kitchen.length, Medicines: h.medicines.length, Household: h.household.length } : null;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Morning summary</Text>
      </View>
      <Text style={[type.small, { fontSize: 14, marginTop: space.lg }]}>
        Small things get one message a day, so the important reminders, like your passport, never get lost.
      </Text>

      <SectionLabel>{`What you get at ${hour}:00`}</SectionLabel>
      <Card style={{ flexDirection: "row", gap: space.md, padding: space.lg }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.heading, color: "#fff" }}>U</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[type.small, { fontSize: 12 }]}>Upkept</Text>
            <Text style={[type.small, { fontSize: 12 }]}>{hour}:00</Text>
          </View>
          <Text style={[type.h3, { marginTop: 2 }]}>{preview?.title ?? "Nothing this week"}</Text>
          <Text style={type.small}>{preview?.body ?? "When nothing runs out, we don't send anything."}</Text>
        </View>
      </Card>

      <SectionLabel>On your timeline</SectionLabel>
      <Pressable onPress={() => router.push("/home")}
        style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.mintText }}>Home list ›</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {counts && Object.entries(counts).map(([k, n]) => (
            <View key={k} style={{ backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mintText }}>{k} {n}</Text>
            </View>
          ))}
        </View>
      </Pressable>

      <SectionLabel>Settings</SectionLabel>
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <View>
          <Text style={type.body}>Summary time</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginTop: space.sm }}>
            {HOURS.map((hr) => (
              <Chip key={hr} label={`${hr}:00`} active={hour === hr} onPress={() => update.mutate({ summary_hour: hr })} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={type.body}>Include family's items</Text>
          <Switch value={h?.summary_include_family ?? true} trackColor={{ true: colors.accent }}
            onValueChange={(v) => update.mutate({ summary_include_family: v })} accessibilityLabel="Include family's items" />
        </View>
        <Text style={type.small}>
          Alerts for single items are off by default. Turn them on for one item (for example a medicine) on that item's screen.
        </Text>
      </Card>
      {update.error ? <View style={{ marginTop: space.md }}><ErrorNote error={update.error} /></View> : null}
    </Screen>
  );
}
