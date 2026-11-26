/** Subscriptions planner: total vs budget, Keep / Review / Cancel, cancel-by dates, savings. */
import type { PlanDecision, Subscription } from "@upkept/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../../src/api/client";
import { useSubscriptions, useUpdateMe } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Card, CircleButton, ErrorNote, Loading, Screen, SectionLabel } from "../../src/components/ui";
import { money, parseAmountInput, shortDate } from "../../src/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const DECISIONS: { key: PlanDecision; label: string; fg: string; bg: string }[] = [
  { key: "keep", label: "Keep", fg: colors.mintText, bg: colors.mint },
  { key: "review", label: "Review", fg: colors.amber, bg: colors.amberBg },
  { key: "cancel", label: "Cancel", fg: colors.red, bg: colors.redBg },
];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayName(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAY[new Date(y, m - 1, d).getDay()]} ${shortDate(iso, false)}`;
}

function SubCard({ s, onDecide }: { s: Subscription; onDecide: (d: PlanDecision | null) => void }) {
  const per = s.recurrence === "yearly" ? "year" : "month";
  return (
    <Card style={{ marginBottom: space.sm, padding: space.lg }}>
      <Pressable onPress={() => router.push(`/item/${s.id}`)}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={[type.h3, { flex: 1 }]} numberOfLines={1}>{s.title}</Text>
          <Text style={type.h3}>{s.amount_minor != null ? `${money(s.amount_minor, s.currency)}/${per === "year" ? "yr" : "mo"}` : "Add cost"}</Text>
        </View>
        <Text style={type.small}>
          {s.renews ? `Next charge ${s.ends_on ? dayName(s.ends_on) : "unknown"}` : `Renew by hand · ends ${shortDate(s.ends_on)}`}
          {s.recurrence === "yearly" && s.monthly_minor ? ` · ${money(s.monthly_minor, s.currency)} a month` : ""}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8, marginTop: space.md }}>
        {DECISIONS.map((d) => {
          const on = s.plan_decision === d.key;
          return (
            <Pressable key={d.key} onPress={() => onDecide(on ? null : d.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={{ flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
                backgroundColor: on ? d.bg : colors.card, borderWidth: 1, borderColor: on ? d.bg : colors.border }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: on ? d.fg : colors.ink }}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {s.plan_decision === "cancel" && s.cancel_by ? (
        <Pressable onPress={() => router.push(`/item/${s.id}`)} style={{ marginTop: space.md }}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.red }}>
            Cancel by {dayName(s.cancel_by)} to avoid the next charge · How to cancel ›
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function SubscriptionsScreen() {
  const subs = useSubscriptions();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [budgetText, setBudgetText] = useState("");
  const d = subs.data;
  const cur = d?.budget_currency ?? "KES";
  const t = d?.totals[cur];
  const others = d ? Object.entries(d.totals).filter(([c]) => c !== cur) : [];
  const budget = d?.budget_minor ?? null;
  const monthly = t?.monthly_minor ?? 0;
  const left = budget != null ? budget - monthly : null;

  const decide = async (id: string, decision: PlanDecision | null) => {
    await api.items.update(id, { plan_decision: decision });
    qc.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  const saveBudget = () => {
    const minor = parseAmountInput(budgetText);
    updateMe.mutate({ monthly_budget_minor: minor }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Subscriptions</Text>
      </View>
      <Text style={[type.small, { fontSize: 14, marginTop: space.md }]}>Everything that charges you regularly. Decide what to keep.</Text>

      {subs.isLoading ? <Loading /> : subs.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={subs.error} /></View> : null}

      {d ? (
        <>
          <Card dark style={{ marginTop: space.lg }}>
            <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft }}>Every month</Text>
            <Text style={{ fontFamily: fonts.heading, fontSize: 36, color: colors.onDark }}>{money(monthly, cur)}</Text>
            <Text style={{ fontFamily: fonts.body, color: colors.onDarkSoft }}>{money(t?.yearly_minor ?? 0, cur)} a year</Text>
            {budget != null ? (
              <>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "#3A3B3E", marginTop: space.lg, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, budget ? (monthly / budget) * 100 : 100)}%`, height: 8, borderRadius: 4,
                    backgroundColor: left! < 0 ? "#FF8A80" : colors.accent }} />
                </View>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, marginTop: 8, color: left! < 0 ? "#FFB4AE" : colors.onDark }}>
                  {left! < 0 ? `${money(-left!, cur)} over your ${money(budget, cur)} budget` : `${money(left!, cur)} left of your ${money(budget, cur)} budget`}
                </Text>
              </>
            ) : null}
            {editing ? (
              <View style={{ marginTop: space.lg }}>
                <TextField label={`Monthly budget (${cur})`} value={budgetText} onChangeText={setBudgetText} keyboardType="decimal-pad"
                  placeholder="e.g. 5,000" />
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Button title="Cancel" variant="light" style={{ flex: 1 }} onPress={() => setEditing(false)} />
                  <Button title="Save" style={{ flex: 1 }} loading={updateMe.isPending} onPress={saveBudget} />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => { setBudgetText(budget != null ? String(budget / 100) : ""); setEditing(true); }} style={{ marginTop: space.md }}>
                <Text style={{ fontFamily: fonts.bodyMedium, color: colors.onDarkSoft }}>{budget != null ? "Change budget ›" : "Set a monthly budget ›"}</Text>
              </Pressable>
            )}
          </Card>

          {t && t.cancel_savings_minor > 0 ? (
            <View style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: space.lg, marginTop: space.md }}>
              <Text style={[type.h3, { color: colors.mintText }]}>
                Cancelling the ones marked saves {money(t.cancel_savings_minor, cur)} a month
              </Text>
              <Text style={[type.small, { color: colors.mintText }]}>That's {money(t.cancel_savings_minor * 12, cur)} a year.</Text>
            </View>
          ) : null}

          {others.map(([c, o]) => (
            <Text key={c} style={[type.small, { marginTop: space.sm }]}>Also {money(o.monthly_minor, c)} a month in {c}.</Text>
          ))}

          <SectionLabel>{`Your subscriptions and bills (${d.items.length})`}</SectionLabel>
          {d.items.map((s) => <SubCard key={s.id} s={s} onDecide={(x) => decide(s.id, x)} />)}
          {!d.items.length ? <Text style={type.body}>Nothing yet. Add the services that charge you every month or year.</Text> : null}

          <Button title="+ Add a subscription" variant="outline" onPress={() => router.push("/subscriptions/add")} style={{ marginTop: space.md }} />
        </>
      ) : null}
    </Screen>
  );
}
