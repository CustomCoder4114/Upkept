/** Design: Money tab. Next 30 days, budget, coming charges, where it goes. First-time screen when empty. */
import { Feather } from "@expo/vector-icons";
import type { UpcomingCharge } from "@upkept/api-client";
import { router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMoneyOverview, useMoneyPlan } from "../../src/api/hooks";
import { Button, Card, ErrorNote, Loading, SectionLabel } from "../../src/components/ui";
import { BILL_TYPES } from "../../src/lib/bills";
import { money, shortDate } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function note(c: UpcomingCharge, isSoon: boolean) {
  if (c.plan_decision === "cancel") return { text: isSoon ? "You plan to cancel · do it now" : "You plan to cancel", color: colors.red };
  if (c.plan_decision === "review") return { text: "You marked it to review", color: colors.amber };
  if (c.type === "renewal") return { text: "Renewal", color: colors.inkSoft };
  return { text: "Repeats", color: colors.inkSoft };
}

function FirstTime() {
  return (
    <>
      <Card dark style={{ marginTop: space.lg }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: colors.onDark }}>
          See every bill and subscription in one place
        </Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onDarkSoft, marginTop: 10 }}>
          Add what charges you regularly. We remind you before each charge, add it all up, and help you cut what you don't use.
          No bank login needed.
        </Text>
      </Card>
      <SectionLabel>Start with the common ones</SectionLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
        {BILL_TYPES.filter((b) => b.key !== "other").map((b) => (
          <Pressable key={b.key} accessibilityRole="button"
            onPress={() => router.push({ pathname: "/subscriptions/add", params: { type: b.key } })}
            style={{ width: "48.5%", height: 64, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14 }}>
            <Feather name={b.icon} size={20} color={colors.primary} />
            <Text style={type.h3}>{b.label}</Text>
          </Pressable>
        ))}
      </View>
      <Button title="+ Add something else" variant="outline" style={{ marginTop: space.md }}
        onPress={() => router.push({ pathname: "/subscriptions/add", params: { type: "other" } })} />
      <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: space.lg, marginTop: space.lg }}>
        <Text style={[type.body, { color: colors.mintText, fontSize: 14 }]}>
          Tip: items you've already added with a cost, like car insurance, show up here by themselves.
        </Text>
      </View>
      <Button title="Set up income and accounts" variant="outline" icon="credit-card" style={{ marginTop: space.md }}
        onPress={() => router.push("/accounts")} />
    </>
  );
}


function PlanCard() {
  const p = useMoneyPlan();
  const d = p.data;
  if (!d) return null;
  const cur = d.currency;
  const setUp = d.income_minor != null || d.accounts.length > 0;
  if (!setUp) {
    return (
      <Pressable onPress={() => router.push("/accounts")} accessibilityRole="button"
        style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginTop: space.md }}>
        <Text style={[type.h3, { color: colors.mintText }]}>Plan your money ›</Text>
        <Text style={[type.small, { color: colors.mintText }]}>
          Add your income and accounts to see what's left after bills, and whether each account covers what's due before payday.
        </Text>
      </Pressable>
    );
  }
  const left = d.left_after_bills_minor;
  return (
    <Card style={{ marginTop: space.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[type.h3, { fontSize: 17 }]}>Your plan</Text>
        <Pressable onPress={() => router.push("/accounts")} hitSlop={8}>
          <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>Edit ›</Text>
        </Pressable>
      </View>
      {d.income_minor != null ? (
        <View style={{ marginTop: space.md, gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={type.body}>Income</Text><Text style={type.h3}>{money(d.income_minor, cur)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={type.body}>Bills, per month</Text><Text style={type.h3}>− {money(d.monthly_bills_minor, cur)}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={type.h3}>Left after bills</Text>
            <Text style={[type.h3, { color: left != null && left < 0 ? colors.red : colors.mintText }]}>{money(left ?? 0, cur)}</Text>
          </View>
        </View>
      ) : null}
      {d.accounts.length ? (
        <View style={{ marginTop: space.lg }}>
          <Text style={type.small}>Until {d.payday ? "payday" : "the next 30 days"} ({shortDate(d.until)})</Text>
          {d.accounts.map((a) => (
            <View key={a.account_id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>{a.name}</Text>
                <Text style={type.small}>
                  {a.due_count} bill{a.due_count === 1 ? "" : "s"} · {money(a.due_minor, cur)}
                  {a.balance_minor == null ? " · add a balance" : ""}
                </Text>
              </View>
              {a.short_minor ? (
                <View style={{ backgroundColor: colors.redBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.red }}>Short {money(a.short_minor, cur)}</Text>
                </View>
              ) : a.after_minor != null ? (
                <Text style={[type.small, { color: colors.mintText }]}>{money(a.after_minor, cur)} left</Text>
              ) : null}
            </View>
          ))}
          {d.unassigned_count ? (
            <Text style={[type.small, { color: colors.amber, marginTop: space.sm }]}>
              {d.unassigned_count} bill{d.unassigned_count === 1 ? " has" : "s have"} no account yet ({money(d.unassigned_due_minor, cur)}). Open a bill to choose one.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function MoneyScreen() {
  const m = useMoneyOverview();
  const d = m.data;
  const cur = d?.currency ?? "KES";
  const over = d && d.budget_minor != null ? d.monthly_minor - d.budget_minor : null;
  const maxGroup = d?.by_group[0]?.yearly_minor ?? 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={m.isRefetching} onRefresh={() => m.refetch()} />}>
        <Text style={type.title}>Money</Text>
        <Text style={[type.small, { fontSize: 14, marginTop: 4 }]}>Your bills and subscriptions. No bank login needed.</Text>

        {m.isLoading ? <Loading /> : m.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={m.error} onRetry={() => m.refetch()} /></View> : null}

        {d?.empty ? <FirstTime /> : null}

        {d && !d.empty ? (
          <>
            <Card dark style={{ marginTop: space.lg }}>
              <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft }}>Next 30 days</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                <Text style={{ fontFamily: fonts.heading, fontSize: 36, color: colors.onDark }}>{money(d.next_30_total_minor, cur)}</Text>
                <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft }}>
                  {d.next_30_count} charge{d.next_30_count === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: "#3A3B3E", marginVertical: 14 }} />
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.onDarkSoft }}>Every month, on average</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onDark }}>
                {money(d.monthly_minor, cur)}
                {over != null ? (
                  <Text style={{ color: over > 0 ? "#FFB4AE" : "#9BE0BE" }}>
                    {over > 0 ? ` · ${money(over, cur)} over budget` : ` · ${money(-over, cur)} under budget`}
                  </Text>
                ) : null}
              </Text>
            </Card>

            <PlanCard />

            <View style={{ flexDirection: "row", gap: 10, marginTop: space.md }}>
              <Button title="Plan subscriptions" style={{ flex: 1 }} onPress={() => router.push("/subscriptions")} />
              <Button title="+ Add a bill" variant="outline" style={{ flex: 1, backgroundColor: colors.card }}
                onPress={() => router.push("/subscriptions/add")} />
            </View>

            <SectionLabel>Coming up</SectionLabel>
            {d.upcoming.length ? (
              <Card style={{ padding: 0 }}>
                {d.upcoming.map((c, idx) => {
                  const [, mm, dd] = c.on.split("-").map(Number);
                  const soon = (Date.parse(c.on) - Date.now()) / 86400000 < 3;
                  const n = note(c, soon);
                  return (
                    <Pressable key={`${c.item_id}-${c.on}`} onPress={() => router.push(`/item/${c.item_id}`)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: space.lg,
                        borderBottomWidth: idx === d.upcoming.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                      <View style={{ width: 44, alignItems: "center" }}>
                        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: soon ? colors.red : colors.inkSoft }}>{MONTHS[mm - 1]}</Text>
                        <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.ink }}>{dd}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={type.h3} numberOfLines={1}>{c.title}</Text>
                        <Text style={{ fontFamily: c.plan_decision ? fonts.bodyBold : fonts.body, fontSize: 13, color: n.color }}>{n.text}</Text>
                      </View>
                      <Text style={type.h3}>{(c.amount_minor / 100).toLocaleString()}</Text>
                    </Pressable>
                  );
                })}
              </Card>
            ) : <Text style={type.small}>Nothing charges in the next 30 days.</Text>}

            {d.by_group.length ? (
              <>
                <SectionLabel>Where it goes, per year</SectionLabel>
                <Card style={{ gap: 14 }}>
                  {d.by_group.map((g) => (
                    <View key={g.group}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={[type.body, { fontSize: 14 }]}>{g.label}</Text>
                        <Text style={[type.h3, { fontSize: 14 }]}>{money(g.yearly_minor, cur)}</Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: "#ECE9E2", marginTop: 6 }}>
                        <View style={{ width: `${Math.max(4, (g.yearly_minor / maxGroup) * 100)}%`, height: 8, borderRadius: 4,
                          backgroundColor: colors.primary }} />
                      </View>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            <Pressable onPress={() => router.push("/subscriptions/add")}
              style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginTop: space.lg }}>
              <Text style={[type.h3, { color: colors.mintText }]}>Missing something?</Text>
              <Text style={[type.small, { color: colors.mintText }]}>
                Rent, electricity tokens and school fees count too. Add them to see the full picture.
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
