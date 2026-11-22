/** Vault: every stored document, searchable, with "keep offline". */
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { api } from "../../src/api/client";
import { useDocuments, useItems } from "../../src/api/hooks";
import { Card, ErrorNote, Loading, Screen, SectionLabel } from "../../src/components/ui";
import { CATEGORY_LABELS } from "../../src/lib/checklists";
import { shortDate } from "../../src/lib/format";
import { downloadForOffline, listOffline, removeOffline } from "../../src/lib/offline";
import { secureTokenStore } from "../../src/lib/secure";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

export default function VaultScreen() {
  const [q, setQ] = useState("");
  const docs = useDocuments({});
  const items = useItems({});
  const [offline, setOffline] = useState<Set<string>>(new Set());
  const qc = useQueryClient();

  useEffect(() => {
    listOffline().then((rows) => setOffline(new Set(rows.map((r) => r.id)))).catch(() => undefined);
  }, [docs.data]);

  const itemById = new Map(items.data?.map((i) => [i.id, i]));
  const filtered = (docs.data ?? []).filter((d) => {
    const it = d.item_id ? itemById.get(d.item_id) : undefined;
    const hay = `${d.title} ${it?.title ?? ""} ${it?.issuer ?? ""}`.toLowerCase();
    return d.is_current && hay.includes(q.trim().toLowerCase());
  });
  const groups = new Map<string, typeof filtered>();
  for (const d of filtered) {
    const cat = (d.item_id && itemById.get(d.item_id)?.category) || "personal";
    groups.set(cat, [...(groups.get(cat) ?? []), d]);
  }

  const toggleOffline = async (id: string, title: string, on: boolean) => {
    try {
      if (on) {
        const t = await secureTokenStore.get();
        await downloadForOffline(api.documents.fileUrl(id), t!.access_token, { id, title });
      } else {
        await removeOffline(id);
      }
      setOffline((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
      qc.invalidateQueries({ queryKey: ["docs"] });
    } catch (e) {
      Alert.alert("Couldn't change offline copy", e instanceof Error ? e.message : "");
    }
  };

  return (
    <Screen>
      <Text style={type.title}>Vault</Text>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, marginTop: space.lg }}>
        <Feather name="search" size={18} color={colors.inkSoft} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search: “laptop receipt”, “passport”" placeholderTextColor={colors.inkMuted}
          style={{ flex: 1, height: 48, marginLeft: 8, fontFamily: fonts.body, fontSize: 15, color: colors.ink }} />
      </View>

      {docs.isLoading ? <Loading /> : docs.error ? <View style={{ marginTop: space.lg }}><ErrorNote error={docs.error} /></View> : null}
      {docs.data && !filtered.length ? <Text style={[type.body, { marginTop: space.xl }]}>Nothing here yet.</Text> : null}

      {[...groups.entries()].map(([cat, list]) => (
        <View key={cat}>
          <SectionLabel>{CATEGORY_LABELS[cat] ?? cat}</SectionLabel>
          <Card style={{ padding: 0 }}>
            {list.map((d, idx) => {
              const it = d.item_id ? itemById.get(d.item_id) : undefined;
              return (
                <View key={d.id} style={{ flexDirection: "row", alignItems: "center", padding: space.lg,
                  borderBottomWidth: idx === list.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                  <Feather name="file-text" size={18} color={colors.inkSoft} style={{ marginRight: space.md }} />
                  <Pressable style={{ flex: 1 }} onPress={() => it && router.push(`/item/${it.id}`)}>
                    <Text style={type.h3}>{it?.title ?? d.title}</Text>
                    <Text style={type.small}>{d.title} · added {shortDate(d.created_at.slice(0, 10))}</Text>
                  </Pressable>
                  <View style={{ alignItems: "center" }}>
                    <Switch value={offline.has(d.id)} onValueChange={(on) => toggleOffline(d.id, d.title, on)}
                      accessibilityLabel="Keep offline" trackColor={{ true: colors.accent }} />
                    <Text style={[type.small, { fontSize: 11 }]}>Offline</Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
