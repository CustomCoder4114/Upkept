/** Design: a Home list item (medicine shown in the design; kitchen and household use the same screen). */
import { Feather } from "@expo/vector-icons";
import type { Item } from "@upkept/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Switch, Text, View } from "react-native";

import { useItem, useRefilled, useUpdateItem } from "../../src/api/hooks";
import { ChecklistStep } from "../../src/components/ChecklistStep";
import { StatusPill } from "../../src/components/DaysPill";
import { Button, Card, CircleButton, ErrorNote, Loading, Screen } from "../../src/components/ui";
import { LOCATION_LABELS, longDate } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const SECTION = { kitchen: "Kitchen", medicines: "Medicines", household: "Household" } as Record<string, string>;

function steps(item: Item) {
  if (item.category === "medicines") {
    return [
      { id: "check", title: "Check how much is left", detail: "If it's nearly finished, just use it up in time." },
      { id: "buy", title: "Buy a new pack", detail: "So the medicine box is never empty when you need it." },
      { id: "handin", title: "Hand in the old pack", detail: "Ask your pharmacy how to dispose of it safely." },
    ];
  }
  if (item.category === "household") {
    return [
      { id: "order", title: "Order or buy a refill", detail: "Before it runs out, not after." },
      { id: "swap", title: "Swap it in", detail: "Then tap Refilled today, and we'll learn how long it lasts." },
    ];
  }
  return [
    { id: "first", title: "Use it first", detail: "Put it at the front of the fridge or cupboard." },
    { id: "freeze", title: "Freeze it if you can", detail: "Many foods keep longer in the freezer. Check the pack." },
  ];
}

export default function HomeItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const update = useUpdateItem(id);
  const refilled = useRefilled(id);

  if (item.isLoading) return <Screen><Loading /></Screen>;
  if (item.error || !item.data) return <Screen><ErrorNote error={item.error} /></Screen>;
  const it = item.data;
  const left = it.days_left;
  const list = steps(it);
  const done = new Set(it.checklist_done);
  const toggle = (sid: string) => {
    const next = new Set(done);
    if (next.has(sid)) next.delete(sid); else next.add(sid);
    update.mutate({ checklist_done: [...next] });
  };
  const finish = (msg: string) =>
    update.mutate({ status: "archived" }, { onSuccess: () => { router.back(); Alert.alert(msg); } });
  const replace = () =>
    update.mutate({ status: "archived" }, {
      onSuccess: () => router.replace({ pathname: "/home/add", params: { name: it.title, place: it.location ?? "" } }),
    });

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.xl }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <CircleButton icon="trash-2" label="Remove" onPress={() =>
          Alert.alert(`Remove ${it.title}?`, undefined, [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => update.mutate({ status: "archived" }, { onSuccess: () => router.back() }) },
          ])} />
      </View>

      <Text style={type.small}>{SECTION[it.category]}{it.location ? ` · ${LOCATION_LABELS[it.location] ?? it.location}` : ""}</Text>
      <Text style={[type.title, { marginTop: 2, marginBottom: space.lg }]}>{it.title}</Text>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={type.bigNumber}>{left === null ? "—" : `${it.cycle_days ? "~" : ""}${Math.abs(left)}`}</Text>
            <Text style={[type.body, { color: colors.inkSoft }]}>{left === null ? "no date" : left < 0 ? "days ago" : "days left"}</Text>
          </View>
          <StatusPill urgency={it.urgency} />
        </View>
        {it.ends_on ? (
          <Text style={[type.small, { marginTop: 10, fontSize: 14 }]}>
            {it.category === "household" ? (it.cycle_days ? "Estimated to run out " : "Runs out ") : it.category === "medicines" ? "Expires " : "Use by "}
            {longDate(it.ends_on)}
          </Text>
        ) : null}
        {it.cycle_days ? <Text style={type.small}>Based on past refills: lasts about {it.cycle_days} days</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.lg }}>
          <Text style={type.body}>Also alert me on the day</Text>
          <Switch value={it.alert_each} onValueChange={(v) => update.mutate({ alert_each: v })} trackColor={{ true: colors.accent }}
            accessibilityLabel="Also alert me on the day" />
        </View>
      </Card>

      <Card dark style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.onDark }}>
            {it.category === "household" ? "Before it runs out" : "Before it expires"}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDarkSoft }}>
            {list.filter((s) => done.has(s.id)).length} of {list.length} done
          </Text>
        </View>
        {list.map((s) => <ChecklistStep key={s.id} title={s.title} detail={s.detail} done={done.has(s.id)} onToggle={() => toggle(s.id)} />)}
        <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.lg }}>
          {it.category === "household" ? (
            <Button title="Refilled today" loading={refilled.isPending} style={{ flex: 1 }}
              onPress={() => refilled.mutate(undefined)} />
          ) : (
            <>
              <Button title="Used it up" variant="light" style={{ flex: 1 }}
                onPress={() => finish(it.category === "medicines" ? "Removed from your medicine box." : "Nice, nothing wasted.")} />
              <Button title={it.category === "medicines" ? "New pack" : "Bought more"} style={{ flex: 1 }} onPress={replace} />
            </>
          )}
        </View>
      </Card>

      {it.category === "medicines" ? (
        <View style={{ backgroundColor: colors.redBg, borderRadius: radius.md, padding: space.lg, flexDirection: "row", gap: space.md, marginTop: space.lg }}>
          <Feather name="alert-circle" size={20} color={colors.red} />
          <Text style={[type.body, { color: colors.red, flex: 1, fontSize: 14 }]}>
            Don't use medicine after its expiry date. Keep the box out of children's reach.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
