/** Emergency folder: each person's ID, passport and medical cover, with their stored copies. */
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { useEmergency } from "../src/api/hooks";
import { Card, CircleButton, ErrorNote, Loading, Screen, SectionLabel } from "../src/components/ui";
import { shortDate } from "../src/lib/format";
import { colors } from "../src/theme/colors";
import { radius, space } from "../src/theme/spacing";
import { fonts, type } from "../src/theme/typography";

export default function EmergencyFolder() {
  const e = useEmergency();

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Emergency folder</Text>
      </View>
      <Text style={[type.small, { fontSize: 14, marginTop: space.md }]}>
        Everyone's key documents in one place. Copies marked “Offline” open with no internet.
      </Text>

      {e.isLoading ? <Loading /> : e.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={e.error} /></View> : null}

      {e.data?.map((person) => (
        <View key={person.profile.id}>
          <SectionLabel>{person.profile.relation === "self" ? `${person.profile.name} (you)` : person.profile.name}</SectionLabel>
          {person.items.length ? (
            <Card style={{ padding: 0 }}>
              {person.items.map((it, idx) => (
                <View key={it.item_id} style={{ padding: space.lg, borderBottomWidth: idx === person.items.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border }}>
                  <Pressable onPress={() => router.push(`/item/${it.item_id}`)}>
                    <Text style={type.h3}>{it.title}</Text>
                    <Text style={type.small}>
                      {it.number_last4 ? `No. •••${it.number_last4}` : "No number saved"}
                      {it.ends_on ? ` · ends ${shortDate(it.ends_on)}` : ""}
                    </Text>
                  </Pressable>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: it.documents.length ? space.sm : 0 }}>
                    {it.documents.map((doc) => (
                      <Pressable key={doc.id} onPress={() => router.push({ pathname: "/document/[id]", params: { id: doc.id, title: doc.title } })}
                        style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 12,
                          borderRadius: radius.pill, backgroundColor: colors.mint }}>
                        <Feather name="file-text" size={15} color={colors.mintText} />
                        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.mintText }}>
                          {doc.title}{doc.keep_offline ? " · Offline" : ""}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  {!it.documents.length ? (
                    <Text style={[type.small, { color: colors.amber, marginTop: 4 }]}>No copy stored yet. Snap it so it's here when you need it.</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : (
            <Card style={{ padding: space.lg }}>
              <Text style={type.small}>No ID or medical cover added for {person.profile.name} yet.</Text>
            </Card>
          )}
        </View>
      ))}
    </Screen>
  );
}
