/** Design: Quick add. Scan a barcode or snap the date, or type it; one-tap dates. */
import { Feather } from "@expo/vector-icons";
import type { Category } from "@upkept/api-client";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCreateItem, useHomeRecent, useProfiles } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Chip, CircleButton, ErrorNote } from "../../src/components/ui";
import { longDate, parseDateInput } from "../../src/lib/format";
import { useApp } from "../../src/store";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const PLACES: { key: string; label: string; category: Category }[] = [
  { key: "fridge", label: "Fridge", category: "kitchen" },
  { key: "cupboard", label: "Cupboard", category: "kitchen" },
  { key: "freezer", label: "Freezer", category: "kitchen" },
  { key: "medicine_box", label: "Medicine box", category: "medicines" },
  { key: "household", label: "Household", category: "household" },
];
const KIND = { kitchen: "food", medicines: "medicine", household: "household_item" } as Record<string, string>;
const QUICK_DATES = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In a week", days: 7 },
  { label: "In a month", days: 30 },
];

function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function friendly(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${WEEKDAY[new Date(y, m - 1, d).getDay()]} ${longDate(iso).replace(/ \d{4}$/, "")}`;
}

export default function QuickAddScreen() {
  const { section, name: presetName, place: presetPlace } =
    useLocalSearchParams<{ section?: string; name?: string; place?: string }>();
  const defaultPlace = presetPlace ?? (section === "medicines" ? "medicine_box" : section === "household" ? "household" : "fridge");

  const [name, setName] = useState(presetName ?? "");
  const [place, setPlace] = useState(defaultPlace);
  const [date, setDate] = useState<string | null>(null);
  const [quick, setQuick] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [alertEach, setAlertEach] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const recent = useHomeRecent();
  const profiles = useProfiles();
  const create = useCreateItem();
  const filter = useApp((s) => s.profileFilter);
  const draft = useApp((s) => s.homeDraft);
  const setDraft = useApp((s) => s.setHomeDraft);

  // Coming back from the camera: take what it found.
  useFocusEffect(
    useCallback(() => {
      if (draft.name) setName(draft.name);
      if (draft.date) { setDate(draft.date); setQuick(null); setTyped(""); }
      if (draft.message) setNote(draft.message);
      if (draft.name || draft.date || draft.message) setDraft({});
    }, [draft, setDraft]),
  );

  const typedIso = typed ? parseDateInput(typed) : null;
  const finalDate = quick !== null ? isoInDays(quick) : typedIso ?? date;
  const category = PLACES.find((p) => p.key === place)?.category ?? "kitchen";
  const profileId = (filter !== "all" ? filter : profiles.data?.find((p) => p.relation === "self")?.id) ?? null;

  const save = () =>
    create.mutate(
      {
        profile_id: profileId!, category, kind: KIND[category], title: name.trim(), ends_on: finalDate,
        location: place, alert_each: alertEach,
      },
      { onSuccess: () => router.back() },
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 60, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <CircleButton icon="x" label="Close" onPress={() => router.back()} />
          <Text style={[type.h2, { fontSize: 22 }]}>Add to Home list</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={() => router.push({ pathname: "/home/camera", params: { mode: "barcode" } })} accessibilityRole="button"
            style={{ flex: 1, backgroundColor: colors.dark, borderRadius: 18, padding: space.lg, gap: 10 }}>
            <Feather name="maximize" size={22} color="#fff" />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" }}>Scan barcode</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: "/home/camera", params: { mode: "date" } })} accessibilityRole="button"
            style={{ flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: space.lg, gap: 10, borderWidth: 1, borderColor: colors.border }}>
            <Feather name="camera" size={22} color={colors.primary} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink }}>Snap the date</Text>
          </Pressable>
        </View>
        {note ? <Text style={[type.small, { color: colors.amber }]}>{note}</Text> : null}

        <TextField label="What is it?" value={name} onChangeText={setName} placeholder="e.g. Milk" />

        <View>
          <Text style={[type.small, { marginBottom: 8 }]}>Where is it kept?</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {PLACES.map((p) => <Chip key={p.key} label={p.label} active={place === p.key} onPress={() => setPlace(p.key)} />)}
          </View>
        </View>

        <View>
          <Text style={[type.small, { marginBottom: 8 }]}>{category === "household" ? "Runs out or needs changing" : "Use by"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {QUICK_DATES.map((q) => (
              <Chip key={q.days} label={q.label} active={quick === q.days} onPress={() => { setQuick(q.days); setTyped(""); setDate(null); }} />
            ))}
          </View>
          <View style={{ marginTop: space.sm }}>
            <TextField label="Or type the date" value={typed} onChangeText={(v) => { setTyped(v); setQuick(null); setDate(null); }}
              placeholder="e.g. 26 November 2026" error={typed && !typedIso ? "Try “26 November 2026”" : undefined} />
          </View>
          {finalDate ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary }}>{friendly(finalDate)}</Text> : null}
        </View>

        {category === "kitchen" && recent.data?.length ? (
          <View>
            <Text style={[type.small, { marginBottom: 8 }]}>Add again</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {recent.data.map((t) => (
                <Pressable key={t} onPress={() => setName(t)}
                  style={{ height: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.mint, justifyContent: "center" }}>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.mintText }}>+ {t}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text style={type.body}>In my morning summary</Text>
            <Feather name="check" size={20} color={colors.accent} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: space.lg }}>
            <Text style={type.body}>Also alert me on the day</Text>
            <Switch value={alertEach} onValueChange={setAlertEach} trackColor={{ true: colors.accent }} accessibilityLabel="Also alert me on the day" />
          </View>
        </View>

        {create.error ? <ErrorNote error={create.error} /> : null}
        <Button title="Add to list" onPress={save} loading={create.isPending} disabled={!name.trim() || !finalDate || !profileId} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
