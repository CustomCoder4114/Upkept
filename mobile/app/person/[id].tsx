/** One family member's items. */
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { useProfiles, useTimeline } from "../../src/api/hooks";
import { ItemCard, ItemRow } from "../../src/components/ItemCard";
import { Button, Card, CircleButton, ErrorNote, Loading, Screen, SectionLabel } from "../../src/components/ui";
import { useApp } from "../../src/store";
import { space } from "../../src/theme/spacing";
import { type } from "../../src/theme/typography";

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useProfiles().data?.find((p) => p.id === id);
  const t = useTimeline(id);
  const setFilter = useApp((s) => s.setProfileFilter);

  const rest = [...(t.data?.coming_up ?? []), ...(t.data?.later ?? []), ...(t.data?.undated ?? [])];

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { marginLeft: space.md }]}>{profile?.name ?? ""}</Text>
      </View>
      {t.isLoading ? <Loading /> : t.error ? <ErrorNote error={t.error} /> : null}
      {t.data?.needs_you.length ? (
        <>
          <SectionLabel>Needs you</SectionLabel>
          {t.data.needs_you.map((i) => <ItemCard key={i.id} item={i} />)}
        </>
      ) : null}
      {rest.length ? (
        <>
          <SectionLabel>Everything else</SectionLabel>
          <Card style={{ padding: 0 }}>{rest.map((i, idx) => <ItemRow key={i.id} item={i} last={idx === rest.length - 1} />)}</Card>
        </>
      ) : t.data && !t.data.needs_you.length ? <Text style={type.body}>Nothing added for {profile?.name} yet.</Text> : null}
      <Button title={`Add something for ${profile?.name ?? "them"}`} style={{ marginTop: space.xl }}
        onPress={() => { setFilter(id); router.push("/add/scan"); }} />
    </Screen>
  );
}
