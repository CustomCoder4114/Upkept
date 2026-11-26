/** Design: Family tab. Needs attention, a card per person, Emergency folder, add someone. First-time screen when just you. */
import { Feather } from "@expo/vector-icons";
import type { PersonCard, Profile } from "@upkept/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, KeyboardAvoidingView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useCreateProfile, useFamily, useMe } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Card, Chip, CircleButton, ErrorNote, Loading, SectionLabel } from "../../src/components/ui";
import { initials } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";
import { daysLabel } from "../../src/theme/urgency";

type Relation = Profile["relation"];
const RELATIONS: { value: Relation; label: string }[] = [
  { value: "child", label: "Child" }, { value: "partner", label: "Partner" },
  { value: "parent", label: "Parent" }, { value: "other", label: "Other" },
];
const STARTERS: { value: Relation; title: string; detail: string; icon: "user" | "heart" | "users" }[] = [
  { value: "child", title: "Add a child", detail: "Birth certificate, passport, school fees, vaccines", icon: "user" },
  { value: "parent", title: "Add a parent", detail: "Medical cover, prescriptions, ID", icon: "heart" },
  { value: "partner", title: "Add a partner", detail: "Licence, passport, shared bills", icon: "users" },
];
const TONE = {
  red: { bg: colors.redBg, fg: colors.red },
  amber: { bg: colors.amberBg, fg: colors.amber },
  green: { bg: colors.mint, fg: colors.mintText },
};
const ATTENTION_COLOR: Record<string, string> = { red: "#FFB4AE", expired: "#FFB4AE", amber: "#F4C77A", charge: "#C9C9C9" };

function age(dob: string | null) {
  if (!dob) return null;
  const b = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

function PersonRow({ p }: { p: PersonCard }) {
  const t = TONE[p.tone];
  const rel = RELATIONS.find((r) => r.value === p.profile.relation)?.label.toLowerCase();
  const yrs = age(p.profile.date_of_birth);
  const next = p.next
    ? `next: ${p.next.title.charAt(0).toLowerCase() + p.next.title.slice(1)} ${p.next.days_left === null ? "" : p.next.days_left < 0 ? "(expired)" : `in ${daysLabel(p.next.days_left).toLowerCase()}`}`
    : "nothing added yet";
  return (
    <Pressable onPress={() => router.push(`/person/${p.profile.id}`)} accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1,
        borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, marginBottom: space.sm }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.mintText }}>{initials(p.profile.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[type.h3, { fontSize: 16 }]}>
          {p.profile.name}
          <Text style={{ fontFamily: fonts.body, color: colors.inkSoft, fontSize: 14 }}>
            {p.profile.relation === "self" ? " (you)" : ` · ${rel}${yrs !== null ? `, ${yrs}` : ""}`}
          </Text>
        </Text>
        <Text style={type.small}>{p.item_count} item{p.item_count === 1 ? "" : "s"} · {next}</Text>
      </View>
      <View style={{ backgroundColor: t.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: t.fg }}>{p.label}</Text>
      </View>
    </Pressable>
  );
}

export default function FamilyScreen() {
  const me = useMe();
  const fam = useFamily();
  const create = useCreateProfile();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Relation>("child");
  const [adding, setAdding] = useState<Relation | null>(null);
  const d = fam.data;
  const justYou = d ? d.people.length <= 1 : false;

  const add = (rel: Relation) =>
    create.mutate(
      { name: name.trim(), relation: rel, date_of_birth: null, nationality: me.data?.country ?? null },
      { onSuccess: () => { setName(""); setAdding(null); } },
    );

  const addForm = (rel: Relation, showRelations: boolean) => (
    <Card style={{ gap: space.sm }}>
      <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Baba, Kevin" autoFocus={!showRelations} />
      {showRelations ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
          {RELATIONS.map((r) => <Chip key={r.value} label={r.label} active={relation === r.value} onPress={() => setRelation(r.value)} />)}
        </View>
      ) : null}
      {create.error ? <ErrorNote error={create.error} /> : null}
      <Button title="Add" loading={create.isPending} disabled={!name.trim()} onPress={() => add(rel)} />
    </Card>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={fam.isRefetching} onRefresh={() => fam.refetch()} />}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <Text style={type.title}>Family</Text>
            {!justYou ? <Text style={[type.small, { fontSize: 14, marginTop: 4 }]}>Everyone you look after, in one place</Text> : null}
          </View>
          <CircleButton icon="settings" label="Settings" onPress={() => router.push("/settings")} />
        </View>

        {fam.isLoading ? <Loading /> : fam.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={fam.error} /></View> : null}

        {d && justYou ? (
          <>
            <Card dark style={{ marginTop: space.lg }}>
              <Text style={{ fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, color: colors.onDark }}>
                Look after everyone's papers, not just yours
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.onDarkSoft, marginTop: 10 }}>
                Add the people you're responsible for. Each person gets their own items and reminders, and you see who needs
                attention at a glance.
              </Text>
            </Card>
            <SectionLabel>Who do you look after?</SectionLabel>
            {STARTERS.map((s) => (
              <View key={s.value} style={{ marginBottom: space.sm }}>
                <Pressable onPress={() => { setAdding(adding === s.value ? null : s.value); setName(""); }} accessibilityRole="button"
                  style={{ flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.card, borderWidth: 1,
                    borderColor: colors.border, borderRadius: radius.lg, padding: space.lg }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" }}>
                    <Feather name={s.icon} size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.h3, { fontSize: 16 }]}>{s.title}</Text>
                    <Text style={type.small}>{s.detail}</Text>
                  </View>
                  <Feather name={adding === s.value ? "chevron-down" : "chevron-right"} size={18} color={colors.inkSoft} />
                </Pressable>
                {adding === s.value ? <View style={{ marginTop: space.sm }}>{addForm(s.value, false)}</View> : null}
              </View>
            ))}
            <Button title="Someone else" variant="outline" onPress={() => { setAdding(adding === "other" ? null : "other"); setName(""); }} />
            {adding === "other" ? <View style={{ marginTop: space.sm }}>{addForm("other", false)}</View> : null}
            <View style={{ flexDirection: "row", gap: 12, backgroundColor: colors.mint, borderRadius: radius.md, padding: space.lg, marginTop: space.lg }}>
              <Feather name="lock" size={20} color={colors.mintText} />
              <Text style={[type.body, { flex: 1, fontSize: 14, color: colors.mintText }]}>
                Only you can see the people you add. Their documents are encrypted like yours.
              </Text>
            </View>
          </>
        ) : null}

        {d && !justYou ? (
          <>
            <Card dark style={{ marginTop: space.lg }}>
              <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.onDark }}>Needs attention</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDarkSoft, marginTop: 4, marginBottom: d.attention.length ? 12 : 0 }}>
                {d.attention.length ? "Across the whole family, most urgent first" : "Nothing for anyone right now."}
              </Text>
              <View style={{ gap: 10 }}>
                {d.attention.map((a) => (
                  <Pressable key={a.item_id} onPress={() => router.push(`/item/${a.item_id}`)}
                    style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.onDark, flex: 1 }} numberOfLines={1}>
                      <Text style={{ color: colors.onDarkSoft }}>{a.person} · </Text>{a.title}
                    </Text>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: ATTENTION_COLOR[a.urgency] ?? colors.onDarkSoft }}>
                      {a.days_left < 0 ? "Expired" : daysLabel(a.days_left)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <SectionLabel>People</SectionLabel>
            {d.people.map((p) => <PersonRow key={p.profile.id} p={p} />)}

            <Pressable onPress={() => router.push("/emergency")} accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderWidth: 1,
                borderColor: colors.border, borderRadius: radius.lg, padding: space.lg, marginTop: space.sm }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.redBg, alignItems: "center", justifyContent: "center" }}>
                <Feather name="heart" size={20} color={colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>Emergency folder</Text>
                <Text style={type.small}>Everyone's ID and medical cover, ready offline</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.inkSoft} />
            </Pressable>

            <SectionLabel>Add someone you look after</SectionLabel>
            {addForm(relation, true)}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderStyle: "dashed",
              borderColor: "#D5D0C6", borderRadius: radius.lg, padding: space.lg, marginTop: space.lg }}>
              <View style={{ flex: 1 }}>
                <Text style={type.h3}>Share with family</Text>
                <Text style={type.small}>Let a brother or sister get Mum's reminders too.</Text>
              </View>
              <View style={{ backgroundColor: colors.neutralBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.neutralText }}>Coming soon</Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
