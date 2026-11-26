/** Design: Home list. "This week" card, then Kitchen / Medicines / Household. */
import type { Item } from "@upkept/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useHome, useProfiles } from "../../src/api/hooks";
import { HomeRow, homeDays } from "../../src/components/HomeRow";
import { Button, Card, Chip, CircleButton, ErrorNote, Loading, SectionLabel } from "../../src/components/ui";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const SECTIONS = [
  { key: "kitchen", label: "Kitchen", empty: "Add milk, bread, leftovers…" },
  { key: "medicines", label: "Medicines", empty: "Add what's in your medicine box." },
  { key: "household", label: "Household", empty: "Add gas, water filter, batteries…" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

function pillColor(item: Item) {
  if (item.urgency === "red" || item.urgency === "expired") return "#FFB4AE";
  if (item.urgency === "amber") return "#F4C77A";
  return colors.onDarkSoft;
}

export default function HomeListScreen() {
  const [filter, setFilter] = useState<"all" | SectionKey>("all");
  const home = useHome();
  const profiles = useProfiles();
  const h = home.data;

  const ownerName = (profileId: string) => {
    const p = profiles.data?.find((x) => x.id === profileId);
    return p && p.relation !== "self" ? p.name : undefined;
  };
  const hour = h ? `${h.summary_hour}:00` : "7:00";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 60, gap: space.lg }}
        refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} />}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
          <Button title="+ Add" onPress={() => router.push("/home/add")} style={{ height: 44, paddingHorizontal: 18 }} />
        </View>

        <View>
          <Text style={type.title}>Home list</Text>
          <Text style={[type.small, { marginTop: 4, fontSize: 14 }]}>Food, medicines and household things</Text>
        </View>

        {home.isLoading ? <Loading /> : home.error ? <ErrorNote error={home.error} onRetry={() => home.refetch()} /> : null}

        {h ? (
          <>
            <Card dark>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.onDark }}>This week</Text>
                <Pressable onPress={() => router.push("/home/summary")} hitSlop={8}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.onDarkSoft }}>Summary at {hour} ›</Text>
                </Pressable>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDarkSoft, marginTop: 6, marginBottom: h.this_week.length ? 14 : 0 }}>
                {h.this_week.length
                  ? `${h.this_week.length} thing${h.this_week.length > 1 ? "s" : ""} to use or replace. One morning summary, not an alert per item.`
                  : "Nothing runs out this week."}
              </Text>
              <View style={{ gap: 8 }}>
                {h.this_week.slice(0, 4).map((i) => (
                  <Pressable key={i.id} onPress={() => router.push(`/home/${i.id}`)}
                    style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDark }}>{i.title}</Text>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: pillColor(i) }}>{homeDays(i)}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} />
              {SECTIONS.map((s) => <Chip key={s.key} label={s.label} active={filter === s.key} onPress={() => setFilter(s.key)} />)}
            </ScrollView>

            {SECTIONS.filter((s) => filter === "all" || filter === s.key).map((s) => {
              const list = h[s.key];
              return (
                <View key={s.key}>
                  <SectionLabel>{s.label}</SectionLabel>
                  {list.length ? (
                    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" }}>
                      {list.map((i, idx) => <HomeRow key={i.id} item={i} last={idx === list.length - 1} ownerName={ownerName(i.profile_id)} />)}
                    </View>
                  ) : (
                    <Pressable onPress={() => router.push({ pathname: "/home/add", params: { section: s.key } })}>
                      <Card style={{ padding: space.lg }}>
                        <Text style={type.small}>{s.empty}</Text>
                      </Card>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
