/** Family: profiles for the people you look after. */
import { Feather } from "@expo/vector-icons";
import type { Profile } from "@upkept/api-client";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useCreateProfile, useMe, useProfiles } from "../../src/api/hooks";
import { TextField } from "../../src/components/TextField";
import { Button, Card, Chip, CircleButton, ErrorNote, Screen, SectionLabel } from "../../src/components/ui";
import { initials } from "../../src/lib/format";
import { colors } from "../../src/theme/colors";
import { space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

const RELATIONS: { value: Profile["relation"]; label: string }[] = [
  { value: "child", label: "Child" }, { value: "partner", label: "Partner" },
  { value: "parent", label: "Parent" }, { value: "other", label: "Other" },
];

export default function FamilyScreen() {
  const me = useMe();
  const profiles = useProfiles();
  const create = useCreateProfile();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState<Profile["relation"]>("child");

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={type.title}>Family</Text>
        <CircleButton icon="settings" label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <SectionLabel>People</SectionLabel>
      {profiles.data?.map((p) => (
        <Pressable key={p.id} onPress={() => router.push(`/person/${p.id}`)}>
          <Card style={{ flexDirection: "row", alignItems: "center", padding: space.lg, marginBottom: space.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mint, alignItems: "center",
              justifyContent: "center", marginRight: space.md }}>
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.mintText }}>{initials(p.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={type.h3}>{p.relation === "self" ? `${p.name} (you)` : p.name}</Text>
              <Text style={type.small}>{RELATIONS.find((r) => r.value === p.relation)?.label ?? "You"}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.inkSoft} />
          </Card>
        </Pressable>
      ))}

      <SectionLabel>Add someone you look after</SectionLabel>
      {me.data?.plan === "free" && (profiles.data?.length ?? 0) >= 1 ? (
        <Card>
          <Text style={type.h3}>Family profiles are part of Premium</Text>
          <Text style={[type.small, { marginTop: 4 }]}>
            Track your children's, partner's or parents' documents with their own reminders.
          </Text>
        </Card>
      ) : (
        <>
          <TextField label="Name" value={name} onChangeText={setName} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: space.md }}>
            {RELATIONS.map((r) => <Chip key={r.value} label={r.label} active={relation === r.value} onPress={() => setRelation(r.value)} />)}
          </View>
          {create.error ? <ErrorNote error={create.error} /> : null}
          <Button title="Add" loading={create.isPending} disabled={!name.trim()}
            onPress={() => create.mutate({ name: name.trim(), relation, date_of_birth: null, nationality: me.data?.country ?? null },
              { onSuccess: () => setName("") })} />
        </>
      )}
    </Screen>
  );
}
