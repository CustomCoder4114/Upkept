/** Design: Travel check. Verdict, then issues grouped by traveller. */
import { Feather } from "@expo/vector-icons";
import type { TripIssue } from "@upkept/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, Text, View } from "react-native";

import { useMe, useTripCheck } from "../../src/api/hooks";
import { Card, CircleButton, ErrorNote, Loading, Screen, SectionLabel } from "../../src/components/ui";
import { COUNTRY_NAMES, shortDate } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const VERDICT = {
  ready: { bg: colors.mint, fg: colors.mintText, label: "READY", title: "You're ready to go" },
  check: { bg: colors.amberBg, fg: colors.amber, label: "ALMOST READY", title: "" },
  not_ready: { bg: colors.redBg, fg: colors.red, label: "NOT READY YET", title: "" },
};

function IssueRow({ issue, country, last }: { issue: TripIssue; country: string; last: boolean }) {
  const blocker = issue.severity === "blocker";
  return (
    <View style={{ flexDirection: "row", padding: space.lg, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, marginRight: space.md, alignItems: "center", justifyContent: "center",
        backgroundColor: blocker ? colors.redBg : colors.amberBg }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: blocker ? colors.red : colors.amber }}>!</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{issue.message}</Text>
        <Text style={type.small}>{issue.detail}</Text>
        {issue.guide_item === "passport" ? (
          <Pressable onPress={() => router.push(`/guide/${country}/passport`)}>
            <Text style={[type.h3, { color: colors.primary, marginTop: 8, fontSize: 14 }]}>Open renewal guide</Text>
          </Pressable>
        ) : issue.guide_item === "visa" ? (
          <Pressable onPress={() => router.push("/add/scan")}>
            <Text style={[type.h3, { color: colors.primary, marginTop: 8, fontSize: 14 }]}>
              Got one? Snap it. If not, check the destination's official visa site.
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function TravelCheckScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const check = useTripCheck(id);
  const me = useMe();
  const home = me.data?.country ?? "KE";

  if (check.isLoading) return <Screen><Loading /></Screen>;
  if (check.error || !check.data) return <Screen><ErrorNote error={check.error} onRetry={() => check.refetch()} /></Screen>;
  const c = check.data;
  const v = VERDICT[c.status];
  const toFix = c.issues.filter((i) => i.severity !== "tip");
  const travellers = [...new Set(c.issues.map((i) => i.traveller).concat(c.ready_travellers))];
  const place = c.trip.city ?? COUNTRY_NAMES[c.trip.destination] ?? c.trip.destination;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h3, { marginLeft: space.md }]}>Travel check</Text>
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.mint, alignItems: "center",
          justifyContent: "center", marginRight: space.md }}>
          <Feather name="navigation" size={20} color={colors.mintText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h2}>{place}</Text>
          <Text style={type.small}>{shortDate(c.trip.starts_on, false)} to {shortDate(c.trip.ends_on)} · {travellers.join(" and ")}</Text>
        </View>
      </Card>

      <View style={{ backgroundColor: v.bg, borderRadius: radius.lg, padding: space.xl, marginTop: space.md }}>
        <Text style={[type.label, { color: v.fg }]}>{v.label}</Text>
        <Text style={[type.h2, { color: v.fg, marginTop: 4 }]}>
          {v.title || `${toFix.length} thing${toFix.length > 1 ? "s" : ""} to ${c.status === "not_ready" ? "fix" : "check"} before you go`}
        </Text>
        {c.status !== "ready" ? (
          <Text style={[type.small, { color: v.fg, marginTop: 4 }]}>Sort them by the dates below and you'll be ready in time.</Text>
        ) : null}
      </View>

      {travellers.map((name) => {
        const mine = toFix.filter((i) => i.traveller === name);
        const tips = c.issues.filter((i) => i.traveller === name && i.severity === "tip");
        return (
          <View key={name}>
            <SectionLabel>{name}</SectionLabel>
            {mine.length ? (
              <Card style={{ padding: 0 }}>
                {mine.map((i, idx) => <IssueRow key={i.code} issue={i} country={home} last={idx === mine.length - 1} />)}
              </Card>
            ) : (
              <Card style={{ flexDirection: "row", alignItems: "center", padding: space.lg }}>
                <Feather name="check-circle" size={20} color={colors.accent} style={{ marginRight: space.md }} />
                <Text style={type.h3}>Passport and visa ready</Text>
              </Card>
            )}
            {tips.map((t) => (
              <View key={t.code} style={{ borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.lg,
                padding: space.lg, marginTop: space.sm, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={type.h3}>{t.message}</Text>
                  <Text style={type.small}>{t.detail}</Text>
                </View>
                <Pressable onPress={() => router.push("/add/scan")} style={{ borderWidth: 1, borderColor: colors.border,
                  borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={type.h3}>Add</Text>
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}

      <Text style={[type.small, { marginTop: space.xl }]}>
        {c.rule_verified ? "Entry rules checked against the official source." : "Entry rules can change. Confirm on the destination's official site before you book."}
        {c.rule_source_url ? (
          <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(c.rule_source_url!)}> Source</Text>
        ) : null}
      </Text>
    </Screen>
  );
}
