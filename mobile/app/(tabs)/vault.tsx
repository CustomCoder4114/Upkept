/** Vault: store and find your most important documents and photos, in folders, encrypted. */
import { Feather } from "@expo/vector-icons";
import type { Folder } from "@upkept/api-client";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDocuments, useItems } from "../../src/api/hooks";
import { Button, Card, ErrorNote, Loading, SectionLabel } from "../../src/components/ui";
import { shortDate } from "../../src/lib/format";
import { FOLDERS, folderForCategory, folderLabel } from "../../src/lib/folders";
import { listOffline } from "../../src/lib/offline";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { fonts, type } from "../../src/theme/typography";

export default function VaultScreen() {
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<Folder | null>(null);
  const docs = useDocuments({});
  const items = useItems({});
  const [offline, setOffline] = useState<Set<string>>(new Set());

  useEffect(() => {
    listOffline().then((rows) => setOffline(new Set(rows.map((r) => r.id)))).catch(() => undefined);
  }, [docs.data]);

  const itemById = new Map(items.data?.map((i) => [i.id, i]));
  // Documents attached to items predate folders: file them by the item's category.
  const folderOf = (d: { folder: Folder; item_id: string | null }) =>
    d.folder !== "other" || !d.item_id ? d.folder : folderForCategory(itemById.get(d.item_id)?.category);
  const current = (docs.data ?? []).filter((d) => d.is_current);
  const counts = new Map<Folder, number>();
  current.forEach((d) => counts.set(folderOf(d), (counts.get(folderOf(d)) ?? 0) + 1));

  const search = q.trim().toLowerCase();
  const shown = current.filter((d) => {
    if (folder && folderOf(d) !== folder) return false;
    if (!search) return true;
    const it = d.item_id ? itemById.get(d.item_id) : undefined;
    return `${d.title} ${it?.title ?? ""} ${it?.issuer ?? ""}`.toLowerCase().includes(search);
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={docs.isRefetching} onRefresh={() => docs.refetch()} />}>
        <Text style={type.title}>Vault</Text>
        <Text style={[type.small, { fontSize: 14, marginTop: 4 }]}>Your most important papers and photos. Encrypted, only for you.</Text>

        <Button title="Store a document" icon="camera" onPress={() => router.push({ pathname: "/vault-add", params: folder ? { folder } : {} })}
          style={{ marginTop: space.lg }} />

        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.lg, marginTop: space.md }}>
          <Feather name="search" size={18} color={colors.inkSoft} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search: “title deed”, “passport”" placeholderTextColor={colors.inkMuted}
            style={{ flex: 1, height: 48, marginLeft: 8, fontFamily: fonts.body, fontSize: 15, color: colors.ink }} />
        </View>

        <SectionLabel>Folders</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 }}>
          {FOLDERS.map((f) => {
            const on = folder === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFolder(on ? null : f.key)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={{ width: "48.5%", borderRadius: radius.md, padding: 14, gap: 6, borderWidth: 1,
                  backgroundColor: on ? colors.ink : colors.card, borderColor: on ? colors.ink : colors.border }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Feather name={f.icon} size={20} color={on ? colors.onDark : colors.primary} />
                  <Text style={{ fontFamily: fonts.bodyBold, color: on ? colors.onDark : colors.inkSoft }}>{counts.get(f.key) ?? 0}</Text>
                </View>
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: on ? colors.onDark : colors.ink }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionLabel>{folder ? folderLabel(folder) : "All documents"}</SectionLabel>
        {docs.isLoading ? <Loading /> : docs.error ? <ErrorNote error={docs.error} /> : null}
        {docs.data && !shown.length ? (
          <Card style={{ padding: space.lg }}>
            <Text style={type.small}>
              {folder ? `Nothing in ${folderLabel(folder)} yet. ${FOLDERS.find((f) => f.key === folder)?.hint}.` : "Nothing stored yet. Tap “Store a document” to add your first one."}
            </Text>
          </Card>
        ) : null}
        {shown.length ? (
          <Card style={{ padding: 0 }}>
            {shown.map((d, idx) => {
              const it = d.item_id ? itemById.get(d.item_id) : undefined;
              return (
                <Pressable key={d.id} onPress={() => router.push({ pathname: "/document/[id]", params: { id: d.id, title: d.title } })}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: space.lg,
                    borderBottomWidth: idx === shown.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                  <Feather name={d.content_type === "application/pdf" ? "file-text" : "image"} size={20} color={colors.inkSoft} />
                  <View style={{ flex: 1 }}>
                    <Text style={type.h3} numberOfLines={1}>{d.title}</Text>
                    <Text style={type.small} numberOfLines={1}>
                      {it ? `${it.title} · ` : ""}{folderLabel(folderOf(d))} · {shortDate(d.created_at.slice(0, 10))}
                    </Text>
                  </View>
                  {offline.has(d.id) ? (
                    <View style={{ backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: colors.mintText }}>Offline</Text>
                    </View>
                  ) : null}
                  <Feather name="chevron-right" size={18} color={colors.inkSoft} />
                </Pressable>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
