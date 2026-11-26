/** Add a bill or subscription. Search popular services, or pick a type; choose the account that pays it. */
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAccounts, useCreateItem, useMe, useProfiles } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Chip, CircleButton, ErrorNote, Screen } from "../../src/components/ui";
import { BILL_TYPES, billType } from "../../src/lib/bills";
import { searchServices } from "../../src/lib/catalog";
import { longDate, parseAmountInput, parseDateInput } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

export default function AddBill() {
  const { type: preset } = useLocalSearchParams<{ type?: string }>();
  const start = billType(preset) ?? billType("streaming")!;
  const me = useMe();
  const profiles = useProfiles();
  const accounts = useAccounts();
  const create = useCreateItem();
  const [kind, setKind] = useState(start.key);
  const [name, setName] = useState(start.name);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [often, setOften] = useState(start.recurrence);
  const [next, setNext] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const t = billType(kind)!;
  const cur = me.data?.currency ?? "USD";
  const amountMinor = parseAmountInput(amount);
  const nextIso = parseDateInput(next);
  const self = profiles.data?.find((p) => p.relation === "self");
  const isPolicy = t.kind === "insurance";
  const showCatalog = kind === "streaming" || kind === "other";
  const matches = searchServices(search, search ? 8 : 12);

  const pickType = (key: string) => {
    const b = billType(key)!;
    if (!name.trim() || name === t.name) setName(b.name);
    setKind(key);
    setOften(b.recurrence);
  };

  const pickService = (svcName: string, svcType: string) => {
    setName(svcName);
    setKind(billType(svcType) ? svcType : "other");
    setOften("monthly");
    setSearch("");
  };

  const save = () =>
    create.mutate(
      {
        profile_id: self!.id, category: t.category, kind: t.kind, title: name.trim(), spend_group: t.group,
        amount_minor: amountMinor, currency: cur, recurrence: often, ends_on: nextIso, account_id: accountId,
      },
      { onSuccess: () => router.back() },
    );

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg }}>
        <CircleButton icon="x" label="Close" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Add a bill</Text>
      </View>

      <Text style={[type.small, { marginBottom: 8 }]}>What kind?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
        {BILL_TYPES.map((b) => <Chip key={b.key} label={b.label} active={kind === b.key} onPress={() => pickType(b.key)} />)}
      </ScrollView>

      {showCatalog ? (
        <View style={{ marginBottom: space.md }}>
          <TextField label="Popular services" value={search} onChangeText={setSearch} placeholder="Search: Netflix, Spotify, iCloud…" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -4 }}>
            {matches.map((m) => (
              <Pressable key={m.name} onPress={() => pickService(m.name, m.type)} accessibilityRole="button"
                style={{ height: 38, paddingHorizontal: 12, borderRadius: radius.pill, justifyContent: "center",
                  backgroundColor: name === m.name ? colors.ink : colors.mint }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: name === m.name ? colors.onDark : colors.mintText }}>{m.name}</Text>
              </Pressable>
            ))}
            {search && !matches.length ? <Text style={type.small}>Not in the list. Just type its name below.</Text> : null}
          </View>
        </View>
      ) : null}

      <TextField label="Name" value={name} onChangeText={setName} placeholder={isPolicy ? "e.g. Medical cover" : "Name"} />
      <TextField label={`What you pay (${cur})`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 1,100" />

      <Text style={[type.small, { marginBottom: 8 }]}>How often?</Text>
      <View style={{ flexDirection: "row", marginBottom: space.md }}>
        <Chip label="Every month" active={often === "monthly"} onPress={() => setOften("monthly")} />
        <Chip label="Every year" active={often === "yearly"} onPress={() => setOften("yearly")} />
      </View>

      <TextField label={isPolicy ? "Renewal date" : "Next charge date"} value={next} onChangeText={setNext}
        placeholder="e.g. 24 December 2026" error={next && !nextIso ? "Try “24 December 2026”" : undefined} />
      {nextIso ? <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary, marginBottom: space.md }}>{longDate(nextIso)}</Text> : null}

      {accounts.data?.length ? (
        <>
          <Text style={[type.small, { marginBottom: 8 }]}>Paid from (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
            {accounts.data.map((a) => (
              <Chip key={a.id} label={a.name} active={accountId === a.id} onPress={() => setAccountId(accountId === a.id ? null : a.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text style={[type.small, { marginBottom: space.md }]}>
        {isPolicy
          ? "We'll remind you before it renews, with steps to compare and renew."
          : `We'll remind you before each charge and move the date forward every ${often === "monthly" ? "month" : "year"}.`}
      </Text>
      {create.error ? <ErrorNote error={create.error} /> : null}
      <Button title="Add" onPress={save} loading={create.isPending} disabled={!name.trim() || !nextIso || !self} />
    </Screen>
  );
}
