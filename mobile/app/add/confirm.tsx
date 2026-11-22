/** Design: "Is this right?" The user checks every field before anything is saved. */
import type { Category } from "@upkept/api-client";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../src/api/client";
import { useCreateItem, useMe, useProfiles, useRenewed } from "../../src/api/hooks";
import { ConfirmRow } from "../../src/components/TextField";
import { Button, Card, Chip, ErrorNote } from "../../src/components/ui";
import { longDate, parseAmountInput, parseDateInput } from "../../src/lib/format";
import { useApp } from "../../src/store";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { type } from "../../src/theme/typography";

const KINDS: { kind: string; title: string; category: Category }[] = [
  { kind: "national_id", title: "National ID", category: "identity" },
  { kind: "passport", title: "Passport", category: "travel" },
  { kind: "driving_licence", title: "Driving licence", category: "vehicles" },
  { kind: "car_insurance", title: "Car insurance", category: "insurance" },
  { kind: "health_insurance", title: "Medical cover", category: "health" },
  { kind: "home_insurance", title: "Home insurance", category: "insurance" },
  { kind: "warranty", title: "Warranty", category: "purchases" },
  { kind: "subscription", title: "Subscription", category: "money" },
  { kind: "visa", title: "Visa", category: "travel" },
  { kind: "other", title: "Other", category: "personal" },
];
const KEEP_OFFLINE_KINDS = new Set(["passport", "national_id", "visa", "driving_licence", "health_insurance", "car_insurance"]);

function docTitle(kind: string, starts: string | null, ends: string | null) {
  const noun = kind.endsWith("insurance") ? "Certificate" : kind === "warranty" ? "Receipt" : "Document";
  const y1 = starts?.slice(0, 4);
  const y2 = ends?.slice(0, 4);
  return y1 && y2 && y1 !== y2 ? `${noun} ${y1}–${y2.slice(2)}` : `${noun} ${y2 ?? y1 ?? ""}`.trim();
}

export default function ConfirmScreen() {
  const scan = useApp((s) => s.pendingScan);
  const me = useMe();
  const profiles = useProfiles();
  const create = useCreateItem();
  const renewed = useRenewed(scan?.renewItemId ?? "");
  const r = scan?.result;

  const [kind, setKind] = useState(r?.kind.value ?? "other");
  const [title, setTitle] = useState(r?.title.value ?? "");
  const [issuer, setIssuer] = useState(r?.issuer.value ?? "");
  const [number, setNumber] = useState(r?.number.value ?? "");
  const [starts, setStarts] = useState(r?.starts_on.value ? longDate(r.starts_on.value) : "");
  const [ends, setEnds] = useState(r?.ends_on.value ? longDate(r.ends_on.value) : "");
  const [amount, setAmount] = useState(r?.amount.value ? Number(r.amount.value).toLocaleString() : "");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const filter = useApp((s) => s.profileFilter); // "Add something for Mum" pre-selects Mum
  const selfProfile = profiles.data?.find((p) => p.relation === "self");
  const chosenProfile = profileId ?? (filter !== "all" ? filter : selfProfile?.id) ?? null;
  const kindInfo = KINDS.find((k) => k.kind === kind) ?? KINDS[KINDS.length - 1];
  const endsIso = parseDateInput(ends);
  const startsIso = starts ? parseDateInput(starts) : null;
  const currency = r?.currency.value ?? me.data?.currency ?? "KES";
  const days = r?.reminder_days ?? [30, 7, 1];

  const problems = useMemo(() => {
    const p: string[] = [];
    if (ends && !endsIso) p.push("We couldn't understand the end date. Try “3 March 2027”.");
    if (starts && !startsIso) p.push("We couldn't understand the start date.");
    if (startsIso && endsIso && endsIso <= startsIso) p.push("The end date is before the start date.");
    return p;
  }, [ends, endsIso, starts, startsIso]);

  if (!scan || !r) return <Redirect href="/add/scan" />;

  const save = async () => {
    if (!chosenProfile) return;
    setSaving(true);
    setError(null);
    try {
      const amountMinor = parseAmountInput(amount);
      let itemId = scan.renewItemId;
      if (itemId) {
        await renewed.mutateAsync({
          ends_on: endsIso!, starts_on: startsIso ?? undefined, amount_minor: amountMinor ?? undefined,
          number: number || undefined,
        });
      } else {
        const item = await create.mutateAsync({
          profile_id: chosenProfile, kind, category: kindInfo.category, title: title || kindInfo.title,
          issuer: issuer || null, number: number || null, starts_on: startsIso, ends_on: endsIso,
          amount_minor: amountMinor, currency: amountMinor != null ? currency : null,
          recurrence: kind === "subscription" ? "monthly" : kind.endsWith("insurance") ? "yearly" : "none",
          country: me.data?.country ?? null,
        });
        itemId = item.id;
      }
      if (scan.photoUri) {
        await api.documents.upload({
          file: { uri: scan.photoUri, name: "scan.jpg", type: "image/jpeg" },
          profile_id: chosenProfile, item_id: itemId, title: docTitle(kind, startsIso, endsIso),
          keep_offline: KEEP_OFFLINE_KINDS.has(kind),
        });
      }
      useApp.getState().setPendingScan(null);
      router.replace(`/item/${itemId}`);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  const conf = (f: { confidence: number }) => (scan.photoUri ? f.confidence : undefined);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }} edges={["top"]}>
      {scan.photoUri ? (
        <Image source={{ uri: scan.photoUri }} style={{ height: 150, margin: 20, borderRadius: 14 }} resizeMode="cover"
          accessibilityLabel="Your photo" />
      ) : <View style={{ height: 40 }} />}
      <ScrollView style={{ backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        contentContainerStyle={{ padding: space.xl, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Text style={type.title}>Is this right?</Text>
        <Text style={[type.body, { color: colors.inkSoft, marginTop: 4, marginBottom: space.lg }]}>
          Check what we read. Tap any line to fix it.{scan.photoUri ? " Lines marked “Check” need a second look." : ""}
        </Text>

        {(r.kind.confidence < 0.7 || kind === "other") && !scan.renewItemId ? (
          <>
            <Text style={[type.small, { marginBottom: 6 }]}>What is it?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
              {KINDS.map((k) => (
                <Chip key={k.kind} label={k.title} active={kind === k.kind} onPress={() => { setKind(k.kind); setTitle(k.title); }} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <ConfirmRow label="Type" value={title || kindInfo.title} onChange={setTitle} />
          <ConfirmRow label="Company" value={issuer} onChange={setIssuer} confidence={conf(r.issuer)} />
          <ConfirmRow label="Number" value={number} onChange={setNumber} confidence={conf(r.number)} />
          <ConfirmRow label="Starts" value={starts} onChange={setStarts} confidence={conf(r.starts_on)} placeholder="e.g. 3 March 2026" />
          <ConfirmRow label="Ends" value={ends} onChange={setEnds} confidence={conf(r.ends_on)} placeholder="e.g. 3 March 2027" />
          <ConfirmRow label={`Cost (${currency})`} value={amount} onChange={setAmount} confidence={conf(r.amount)}
            keyboardType="decimal-pad" last />
        </Card>

        {profiles.data && profiles.data.length > 1 && !scan.renewItemId ? (
          <>
            <Text style={[type.small, { marginTop: space.lg, marginBottom: 6 }]}>Whose is it?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profiles.data.map((p) => (
                <Chip key={p.id} label={p.relation === "self" ? "Me" : p.name} active={chosenProfile === p.id} onPress={() => setProfileId(p.id)} />
              ))}
            </ScrollView>
          </>
        ) : null}

        {[...r.warnings, ...problems].map((w) => (
          <Text key={w} style={[type.small, { color: colors.amber, marginTop: space.md }]}>{w}</Text>
        ))}

        {endsIso ? (
          <View style={{ backgroundColor: colors.mint, borderRadius: radius.md, padding: space.lg, marginTop: space.lg }}>
            <Text style={[type.body, { color: colors.mintText }]}>
              We will remind you {days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}` : days[0]}{" "}
              {days[days.length - 1] === 1 ? "day" : "days"} before it ends.
            </Text>
          </View>
        ) : null}

        {error ? <View style={{ marginTop: space.md }}><ErrorNote error={error} /></View> : null}

        <Button title="Confirm and save" onPress={save} loading={saving}
          disabled={!endsIso || problems.length > 0 || !chosenProfile} style={{ marginTop: space.xl }} />
        <Button title="Retake photo" variant="outline" onPress={() => router.replace({ pathname: "/add/scan",
          params: scan.renewItemId ? { renew: scan.renewItemId } : {} })} style={{ marginTop: space.sm }} />
        {r.ai_scans_left !== null && r.ai_scans_left <= 3 ? (
          <Text style={[type.small, { textAlign: "center", marginTop: space.md }]}>{r.ai_scans_left} free AI scans left this month</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
