/** Design: item screen with the countdown and the dark "Get it done" card. */
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { useAccounts, useDocuments, useGuide, useItem, useMe, useUpdateItem } from "../../src/api/hooks";
import { ChecklistStep } from "../../src/components/ChecklistStep";
import { StatusPill } from "../../src/components/DaysPill";
import { Button, Card, Chip, CircleButton, ErrorNote, Loading, Screen } from "../../src/components/ui";
import { breadcrumb, fallbackSteps } from "../../src/lib/checklists";
import { progress, shortDate } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";
import { urgencyStyle } from "../../src/theme/urgency";

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const me = useMe();
  const country = item.data?.country ?? me.data?.country;
  const guide = useGuide(country, item.data?.kind.replace(/_/g, "-"));
  const docs = useDocuments({ item_id: id });
  const update = useUpdateItem(id);
  const accounts = useAccounts();

  if (item.isLoading) return <Screen><Loading /></Screen>;
  if (item.error || !item.data) return <Screen><ErrorNote error={item.error} /></Screen>;
  const it = item.data;

  const steps = guide.data?.steps ?? fallbackSteps(it);
  const done = new Set(it.checklist_done);
  const toggle = (stepId: string) => {
    const next = new Set(done);
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    update.mutate({ checklist_done: [...next] });
  };
  const currentDoc = docs.data?.find((d) => d.is_current);
  const left = it.days_left;

  const more = () =>
    Alert.alert(it.title, undefined, [
      { text: "I'm not renewing this", onPress: () => update.mutate({ status: "not_renewing" }) },
      { text: "Archive", onPress: () => update.mutate({ status: "archived" }, { onSuccess: () => router.back() }) },
      { text: "Cancel", style: "cancel" },
    ]);

  const openSite = () => {
    if (guide.data) Linking.openURL(guide.data.official_url);
    else if (it.issuer) Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(`${it.issuer} renew`)}`);
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: space.xl }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <CircleButton icon="more-horizontal" label="More options" onPress={more} />
      </View>

      <Text style={type.small}>{breadcrumb(it)}</Text>
      <Text style={[type.title, { marginTop: 2, marginBottom: space.lg }]}>{it.title}</Text>

      {/* Countdown */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={type.bigNumber}>{left === null ? "—" : Math.abs(left)}</Text>
            <Text style={[type.body, { color: colors.inkSoft, marginLeft: 6 }]}>
              {left === null ? "no end date" : left < 0 ? "days ago" : "days left"}
            </Text>
          </View>
          <StatusPill urgency={it.urgency} />
        </View>
        {it.starts_on && it.ends_on ? (
          <>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: "#ECE9E2", marginTop: space.lg, overflow: "hidden" }}>
              <View style={{ width: `${progress(it.starts_on, it.ends_on) * 100}%`, height: 8, borderRadius: 4,
                backgroundColor: urgencyStyle[it.urgency].dot }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={type.small}>Started {shortDate(it.starts_on)}</Text>
              <Text style={type.small}>Ends {shortDate(it.ends_on)}</Text>
            </View>
          </>
        ) : it.ends_on ? <Text style={[type.small, { marginTop: 8 }]}>Ends {shortDate(it.ends_on)}</Text> : null}
        {it.reminder_dates.length ? (
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: space.lg }}>
            <Text style={[type.small, { marginRight: 8 }]}>Reminders</Text>
            {it.reminder_dates.map((d) => (
              <View key={d} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill,
                paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginTop: 4 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink }}>{shortDate(d, false)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      {/* Get it done */}
      <Card dark style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.onDark }}>Get it done</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDarkSoft }}>
            {steps.filter((s) => done.has(s.id)).length} of {steps.length} done
          </Text>
        </View>
        {left !== null && left > 60 && done.size === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.onDarkSoft, marginBottom: space.sm }}>
            No rush yet. We'll remind you when it's time to start.
          </Text>
        ) : null}
        {steps.map((s) => (
          <ChecklistStep key={s.id} title={s.title} detail={s.detail} done={done.has(s.id)} onToggle={() => toggle(s.id)} />
        ))}
        <View style={{ flexDirection: "row", marginTop: space.lg }}>
          {guide.data || it.issuer ? (
            <Button title={guide.data ? "Official site" : `Find ${it.issuer}`} variant="light" onPress={openSite}
              style={{ flex: 1, marginRight: space.sm }} />
          ) : null}
          <Button title="Snap new one" onPress={() => router.push({ pathname: "/add/scan", params: { renew: it.id } })}
            style={{ flex: 1 }} />
        </View>
        {guide.data ? (
          <Pressable onPress={() => router.push(`/guide/${guide.data!.country}/${it.kind.replace(/_/g, "-")}`)}
            style={{ marginTop: space.md }}>
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.onDarkSoft, textAlign: "center" }}>
              Full guide: cost, documents, how long it takes
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {/* Which account pays it (bills only) */}
      {it.amount_minor != null && accounts.data?.length ? (
        <Card style={{ marginTop: space.lg, padding: space.lg }}>
          <Text style={[type.small, { marginBottom: 8 }]}>Paid from</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {accounts.data.map((a) => (
              <Chip key={a.id} label={a.name} active={it.account_id === a.id}
                onPress={() => update.mutate({ account_id: it.account_id === a.id ? null : a.id })} />
            ))}
          </View>
        </Card>
      ) : null}

      {/* Stored document */}
      {currentDoc ? (
        <Pressable onPress={() => router.push(`/(tabs)/vault`)}>
          <Card style={{ flexDirection: "row", alignItems: "center", marginTop: space.lg, padding: space.lg }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#F3EFE6", marginRight: space.md,
              alignItems: "center", justifyContent: "center" }}>
              <Feather name="file-text" size={18} color={colors.inkSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{currentDoc.title}</Text>
              <Text style={type.small}>In your vault{currentDoc.keep_offline ? " · available offline" : ""}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.inkSoft} />
          </Card>
        </Pressable>
      ) : null}
    </Screen>
  );
}
