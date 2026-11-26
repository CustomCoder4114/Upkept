/** View a stored document (offline copy if there is one), keep it offline, move or delete it. */
import type { Folder } from "@upkept/api-client";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, Switch, Text, View } from "react-native";

import { api } from "../../src/api/client";
import { useDocumentMutations, useDocuments } from "../../src/api/hooks";
import { Chip, CircleButton, Loading, Screen } from "../../src/components/ui";
import { FOLDERS } from "../../src/lib/folders";
import { downloadForOffline, getOffline, offlineAvailable, removeOffline } from "../../src/lib/offline";
import { secureTokenStore } from "../../src/lib/secure";
import { colors } from "../../src/theme/colors";
import { radius, space } from "../../src/theme/spacing";
import { type } from "../../src/theme/typography";

type Source = { uri: string; headers?: Record<string, string> } | { pdf: true } | null;

export default function DocumentViewer() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const docs = useDocuments({});
  const { update, remove } = useDocumentMutations();
  const doc = docs.data?.find((d) => d.id === id);
  const [source, setSource] = useState<Source>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const local = await getOffline(id);
        if (local) {
          setOffline(true);
          setSource(local.content_type === "application/pdf" ? { pdf: true } : { uri: `data:${local.content_type};base64,${local.data_base64}` });
          return;
        }
      } catch {
        /* no offline storage on this phone: use the server */
      }
      const t = await secureTokenStore.get();
      setSource({ uri: api.documents.fileUrl(id), headers: t ? { Authorization: `Bearer ${t.access_token}` } : undefined });
    })();
  }, [id]);

  const toggleOffline = async (on: boolean) => {
    try {
      if (on) {
        const t = await secureTokenStore.get();
        await downloadForOffline(api.documents.fileUrl(id), t!.access_token, { id, title: doc?.title ?? "Document" });
      } else {
        await removeOffline(id);
      }
      setOffline(on);
      update.mutate({ id, keep_offline: on });
    } catch (e) {
      Alert.alert("Couldn't change the offline copy", e instanceof Error ? e.message : "");
    }
  };

  const del = () =>
    Alert.alert("Delete this document?", "It's removed from the Vault for good.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => remove.mutate(id, { onSuccess: async () => { await removeOffline(id).catch(() => undefined); router.back(); } }),
      },
    ]);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg }}>
        <CircleButton icon="chevron-left" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <Text style={[type.h2, { fontSize: 20 }]} numberOfLines={1}>{doc?.title ?? title ?? "Document"}</Text>
          {offline ? <Text style={type.small}>Offline copy</Text> : null}
        </View>
        <CircleButton icon="trash-2" label="Delete" onPress={del} />
      </View>

      {source === null ? <Loading /> : "pdf" in source ? (
        <Text style={type.body}>This is a PDF. Opening PDFs inside the app is coming in a later update.</Text>
      ) : (
        <Image source={source} resizeMode="contain" accessibilityLabel={doc?.title ?? "Document"}
          style={{ height: 420, borderRadius: radius.md, backgroundColor: colors.dark }} />
      )}

      {doc ? (
        <>
          {offlineAvailable() ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card,
              borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginTop: space.lg }}>
              <Text style={type.body}>Keep a copy on this phone</Text>
              <Switch value={offline} onValueChange={toggleOffline} trackColor={{ true: colors.accent }} accessibilityLabel="Keep a copy on this phone" />
            </View>
          ) : null}
          <Text style={[type.small, { marginTop: space.lg, marginBottom: 8 }]}>Folder</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FOLDERS.map((f) => (
              <Chip key={f.key} label={f.label} active={doc.folder === f.key}
                onPress={() => update.mutate({ id, folder: f.key as Folder })} />
            ))}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}
