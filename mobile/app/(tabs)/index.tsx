/** Design: "Your timeline" (home). */
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useState } from "react";

import { useCalendar, useMe, useProfiles, useReminders, useTimeline } from "../../src/api/hooks";
import { MonthCalendar, monthKey } from "../../src/components/MonthCalendar";
import { ItemCard, ItemRow } from "../../src/components/ItemCard";
import { ScoreRing } from "../../src/components/ScoreRing";
import { Card, Chip, CircleButton, ErrorNote, Loading, SectionLabel } from "../../src/components/ui";
import { greeting, longDate } from "../../src/lib/format";
import { useApp } from "../../src/store";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

export default function TimelineScreen() {
  const { profileFilter, setProfileFilter } = useApp();
  const me = useMe();
  const profiles = useProfiles();
  const timeline = useTimeline(profileFilter === "all" ? undefined : profileFilter);
  const reminders = useReminders();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(monthKey(new Date()));
  const [day, setDay] = useState<string | null>(null);
  const cal = useCalendar(month, profileFilter === "all" ? undefined : profileFilter);

  const nameOf = (profileId: string) => {
    if (profileFilter !== "all") return undefined;
    const p = profiles.data?.find((x) => x.id === profileId);
    return p && p.relation !== "self" ? p.name : undefined;
  };
  const t = timeline.data;
  const needsCount = t?.needs_you.length ?? 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={timeline.isRefetching} onRefresh={() => timeline.refetch()} />}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View>
            <Text style={type.small}>{greeting()}{me.data ? `, ${me.data.name.split(" ")[0]}` : ""}</Text>
            <Text style={[type.title, { marginTop: 2 }]}>Your timeline</Text>
          </View>
          <CircleButton icon="bell" label="Reminders" badge={!!reminders.data?.length} onPress={() => router.push("/notifications")} />
        </View>

        {timeline.isLoading ? <Loading /> : timeline.error ? (
          <View style={{ marginTop: space.xl }}><ErrorNote error={timeline.error} onRetry={() => timeline.refetch()} /></View>
        ) : t ? (
          <>
            {/* Needs you comes first; the score card sits below it. */}
            {profiles.data && profiles.data.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.xl }}>
                <Chip label="Everyone" active={profileFilter === "all"} onPress={() => setProfileFilter("all")} />
                {profiles.data.map((p) => (
                  <Chip key={p.id} label={p.relation === "self" ? "Me" : p.name} active={profileFilter === p.id}
                    onPress={() => setProfileFilter(p.id)} />
                ))}
              </ScrollView>
            ) : null}

            <View style={{ flexDirection: "row", backgroundColor: "#E9E6DF", borderRadius: radius.pill, padding: 4, marginTop: space.lg }}>
              {(["list", "calendar"] as const).map((v) => (
                <Pressable key={v} onPress={() => setView(v)} accessibilityRole="button" accessibilityState={{ selected: view === v }}
                  style={{ flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
                    backgroundColor: view === v ? colors.card : "transparent" }}>
                  <Text style={[type.h3, { fontSize: 14 }]}>{v === "list" ? "List" : "Calendar"}</Text>
                </Pressable>
              ))}
            </View>

            {view === "calendar" ? (
              <View style={{ marginTop: space.lg }}>
                <MonthCalendar month={month} days={cal.data?.days ?? {}} selected={day}
                  onSelect={setDay} onMonth={(m) => { setMonth(m); setDay(null); }} />
                {cal.error ? <View style={{ marginTop: space.md }}><ErrorNote error={cal.error} /></View> : null}
                {day ? (
                  <>
                    <SectionLabel>{longDate(day)}</SectionLabel>
                    {(cal.data?.days[day] ?? []).length ? (
                      <Card style={{ padding: 0 }}>
                        {(cal.data?.days[day] ?? []).map((e, idx, arr) => (
                          <Pressable key={`${e.item_id}-${idx}`} onPress={() => router.push(`/item/${e.item_id}`)}
                            style={{ flexDirection: "row", alignItems: "center", padding: space.lg,
                              borderBottomWidth: idx === arr.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                            <Text style={[type.h3, { flex: 1 }]}>{e.title}</Text>
                            <Text style={type.small}>{e.type === "charge" ? "Charges" : "Ends"}</Text>
                          </Pressable>
                        ))}
                      </Card>
                    ) : <Text style={type.small}>Nothing due this day.</Text>}
                  </>
                ) : <Text style={[type.small, { marginTop: space.md }]}>Tap a day to see what's due.</Text>}
              </View>
            ) : null}

            {view === "list" ? (<>
            <SectionLabel>Needs you</SectionLabel>
            {t.needs_you.length ? t.needs_you.map((i) => <ItemCard key={i.id} item={i} ownerName={nameOf(i.profile_id)} />) : (
              <Card style={{ padding: space.lg }}><Text style={type.body}>Nothing needs you right now. 🎉</Text></Card>
            )}

            <Pressable
              onPress={() => router.push("/home")}
              accessibilityRole="button"
              style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginTop: space.md }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.mintText }}>Home list</Text>
                <Feather name="chevron-right" size={18} color={colors.mintText} />
              </View>
              <Text style={[type.small, { color: colors.mintText, marginTop: 4 }]}>
                {t.home.total
                  ? `${t.home.total} thing${t.home.total > 1 ? "s" : ""} this week · Kitchen ${t.home.kitchen} · Medicines ${t.home.medicines} · Household ${t.home.household}`
                  : "Food, medicines and household things"}
              </Text>
            </Pressable>

            <Card dark style={{ flexDirection: "row", alignItems: "center", marginTop: space.md }}>
              <ScoreRing score={t.score} />
              <View style={{ flex: 1, marginLeft: space.lg }}>
                <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.onDark }}>Life in Order</Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDarkSoft, marginTop: 4 }}>
                  {needsCount ? `${needsCount} item${needsCount > 1 ? "s" : ""} need${needsCount > 1 ? "" : "s"} you soon. ` : ""}
                  {t.suggestions[0] ? `${t.suggestions[0].text}${t.suggestions[0].points ? ` for +${t.suggestions[0].points}` : ""}.` : ""}
                </Text>
              </View>
            </Card>

            {t.coming_up.length ? (
              <>
                <SectionLabel>Coming up</SectionLabel>
                <Card style={{ padding: 0 }}>
                  {t.coming_up.map((i, idx) => (
                    <ItemRow key={i.id} item={i} last={idx === t.coming_up.length - 1} ownerName={nameOf(i.profile_id)} />
                  ))}
                </Card>
              </>
            ) : null}

            {t.later.length ? (
              <>
                <SectionLabel>Later</SectionLabel>
                <Card style={{ padding: 0 }}>
                  {t.later.map((i, idx) => <ItemRow key={i.id} item={i} last={idx === t.later.length - 1} />)}
                </Card>
              </>
            ) : null}

            </>) : null}

            {!t.needs_you.length && !t.coming_up.length && !t.later.length ? (
              <Card style={{ marginTop: space.xl }}>
                <Text style={type.h3}>Add your first item</Text>
                <Text style={[type.small, { marginTop: 4 }]}>Tap + and snap your ID, passport or an insurance certificate.</Text>
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
