/** A country renewal guide: steps, documents, cost, time, official link, last checked. */
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Text, View } from "react-native";

import { useGuide } from "../../../src/api/hooks";
import { Button, Card, CircleButton, ErrorNote, Loading, Screen, SectionLabel } from "../../../src/components/ui";
import { money, shortDate } from "../../../src/lib/format";
import { colors } from "../../../src/theme/colors";
import { space } from "../../../src/theme/spacing";
import { type } from "../../../src/theme/typography";

export default function GuideScreen() {
  const { country, item } = useLocalSearchParams<{ country: string; item: string }>();
  const guide = useGuide(country, item);

  if (guide.isLoading) return <Screen><Loading /></Screen>;
  if (guide.error || !guide.data) {
    return (
      <Screen>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <View style={{ marginTop: space.xl }}><ErrorNote error={guide.error ?? new Error("No guide yet")} /></View>
      </Screen>
    );
  }
  const g = guide.data;

  return (
    <Screen>
      <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
      <Text style={[type.title, { marginTop: space.lg }]}>{g.title}</Text>
      <Text style={[type.body, { color: colors.inkSoft, marginTop: 6 }]}>{g.summary}</Text>

      <Card style={{ marginTop: space.lg }}>
        <Text style={type.small}>Cost</Text>
        <Text style={type.h3}>{g.cost.amount != null ? money(g.cost.amount * 100, g.cost.currency) : "Shown on your invoice"}</Text>
        <Text style={[type.small, { marginTop: 4 }]}>{g.cost.note}</Text>
        <Text style={[type.small, { marginTop: space.md }]}>How long it takes</Text>
        <Text style={type.h3}>{g.processing_time}</Text>
      </Card>

      <SectionLabel>Steps</SectionLabel>
      <Card style={{ padding: 0 }}>
        {g.steps.map((s, i) => (
          <View key={s.id} style={{ flexDirection: "row", padding: space.lg, borderBottomWidth: i === g.steps.length - 1 ? 0 : 1,
            borderBottomColor: colors.border }}>
            <Text style={[type.h3, { width: 26, color: colors.primary }]}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{s.title}</Text>
              <Text style={type.small}>{s.detail}</Text>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel>What to bring</SectionLabel>
      <Card>
        {g.documents_needed.map((d) => <Text key={d} style={[type.body, { marginBottom: 6 }]}>•  {d}</Text>)}
      </Card>

      {g.tips.length ? (
        <>
          <SectionLabel>Good to know</SectionLabel>
          {g.tips.map((t) => <Text key={t} style={[type.body, { marginBottom: 8 }]}>{t}</Text>)}
        </>
      ) : null}

      <Button title="Open the official site" onPress={() => Linking.openURL(g.official_url)} style={{ marginTop: space.lg }} />
      <Text style={[type.small, { marginTop: space.md, textAlign: "center" }]}>
        Last checked {shortDate(g.last_checked)}. Rules and fees change; the official site is always right.
      </Text>
    </Screen>
  );
}
