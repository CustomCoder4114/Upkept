/** Money plan setup: monthly income, payday, and accounts (added by hand, never connected to a bank). */
import { Feather } from "@expo/vector-icons";
import type { Account } from "@upkept/api-client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { useAccountMutations, useAccounts, useMe, useUpdateMe } from "../src/api/hooks";
import { TextField } from "../src/components/TextField";
import { Button, Card, CircleButton, ErrorNote, Screen, SectionLabel } from "../src/components/ui";
import { money, parseAmountInput } from "../src/lib/format";
import { colors } from "../src/theme/colors";
import { radius, space } from "../src/theme/spacing";
import { fonts, type } from "../src/theme/typography";

function AccountRow({ a }: { a: Account }) {
  const { update, remove } = useAccountMutations();
  const [editing, setEditing] = useState(false);
  const [bal, setBal] = useState(a.balance_minor != null ? String(a.balance_minor / 100) : "");
  const updated = a.balance_updated_at ? new Date(a.balance_updated_at).toLocaleDateString() : null;

  return (
    <Card style={{ marginBottom: space.sm, padding: space.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" }}>
          <Feather name="credit-card" size={18} color={colors.mintText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={type.h3}>{a.name}</Text>
          <Text style={type.small}>{[a.bank, a.last4 ? `•••• ${a.last4}` : null].filter(Boolean).join(" · ") || "No bank name"}</Text>
        </View>
        <Pressable onPress={() => setEditing(!editing)} hitSlop={8}>
          <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>{editing ? "Done" : "Update"}</Text>
        </Pressable>
      </View>
      <Text style={[type.h3, { marginTop: space.md, fontSize: 18 }]}>
        {a.balance_minor != null ? money(a.balance_minor, a.currency) : "No balance entered"}
      </Text>
      {updated ? <Text style={type.small}>Balance as of {updated}</Text> : null}
      {editing ? (
        <View style={{ marginTop: space.md }}>
          <TextField label={`Current balance (${a.currency})`} value={bal} onChangeText={setBal} keyboardType="decimal-pad" />
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button title="Remove" variant="outline" style={{ flex: 1 }} onPress={() =>
              Alert.alert(`Remove ${a.name}?`, "Bills paid from it will just have no account.", [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => remove.mutate(a.id) },
              ])} />
            <Button title="Save" style={{ flex: 1 }} loading={update.isPending}
              onPress={() => update.mutate({ id: a.id, balance_minor: parseAmountInput(bal) }, { onSuccess: () => setEditing(false) })} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

export default function AccountsScreen() {
  const me = useMe();
  const accounts = useAccounts();
  const updateMe = useUpdateMe();
  const { create } = useAccountMutations();
  const cur = me.data?.currency ?? "USD";

  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState("");
  useEffect(() => {
    if (me.data) {
      setIncome(me.data.monthly_income_minor != null ? String(me.data.monthly_income_minor / 100) : "");
      setPayday(me.data.payday != null ? String(me.data.payday) : "");
    }
  }, [me.data]);
  const paydayNum = payday ? Number(payday) : null;
  const paydayBad = payday !== "" && (!Number.isInteger(paydayNum) || paydayNum! < 1 || paydayNum! > 31);

  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("");
  const last4Bad = last4 !== "" && !/^\d{4}$/.test(last4);

  const addAccount = () =>
    create.mutate(
      { name: name.trim(), bank: bank.trim() || null, last4: last4 || null, balance_minor: parseAmountInput(balance), currency: cur },
      { onSuccess: () => { setName(""); setBank(""); setLast4(""); setBalance(""); } },
    );

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Your money plan</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 12, backgroundColor: colors.mint, borderRadius: radius.md, padding: space.lg, marginTop: space.lg }}>
        <Feather name="lock" size={20} color={colors.mintText} />
        <Text style={[type.body, { flex: 1, fontSize: 14, color: colors.mintText }]}>
          Upkept never logs in to your bank and can't move money. You type in your balances, and only the last 4 digits
          of an account number are ever saved.
        </Text>
      </View>

      <SectionLabel>Income</SectionLabel>
      <Card>
        <TextField label={`Take-home pay per month (${cur})`} value={income} onChangeText={setIncome} keyboardType="decimal-pad" placeholder="e.g. 60,000" />
        <TextField label="Payday (day of the month, 1–31)" value={payday} onChangeText={setPayday} keyboardType="number-pad"
          placeholder="e.g. 25" error={paydayBad ? "Enter a day from 1 to 31" : undefined} />
        {updateMe.error ? <ErrorNote error={updateMe.error} /> : null}
        <Button title="Save income" loading={updateMe.isPending} disabled={paydayBad}
          onPress={() => updateMe.mutate({ monthly_income_minor: parseAmountInput(income), payday: paydayNum })} />
      </Card>

      <SectionLabel>Accounts</SectionLabel>
      {accounts.data?.map((a) => <AccountRow key={a.id} a={a} />)}
      {accounts.data && !accounts.data.length ? (
        <Text style={[type.small, { marginBottom: space.sm }]}>Add the accounts your bills come out of, like your salary account or mobile money.</Text>
      ) : null}

      <Card style={{ marginTop: space.sm }}>
        <Text style={[type.h3, { marginBottom: space.md }]}>Add an account</Text>
        <TextField label="Nickname" value={name} onChangeText={setName} placeholder="e.g. Salary account, M-Pesa" />
        <TextField label="Bank or provider (optional)" value={bank} onChangeText={setBank} placeholder="e.g. Equity Bank, Chase" />
        <TextField label="Last 4 digits (optional)" value={last4} onChangeText={setLast4} keyboardType="number-pad" maxLength={4}
          error={last4Bad ? "Just the last 4 digits" : undefined} />
        <TextField label={`Current balance (${cur}, optional)`} value={balance} onChangeText={setBalance} keyboardType="decimal-pad" />
        {create.error ? <ErrorNote error={create.error} /> : null}
        <Button title="Add account" loading={create.isPending} disabled={!name.trim() || last4Bad} onPress={addAccount} />
      </Card>

      <Text style={[type.small, { marginTop: space.lg }]}>
        Then choose which account pays each bill (on the bill's screen) and the Money tab shows whether each account will
        cover what's due before payday.
      </Text>
    </Screen>
  );
}
