/** Store a document in the Vault: snap or pick a photo, name it, choose a folder and whose it is. */
import { Feather } from "@expo/vector-icons";
import type { Folder } from "@upkept/api-client";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { api } from "../src/api/client";
import { useProfiles } from "../src/api/hooks";
import { TextField } from "../src/components/TextField";
import { Button, Chip, CircleButton, ErrorNote, Screen } from "../src/components/ui";
import { FOLDERS } from "../src/lib/folders";
import { downloadForOffline, offlineAvailable } from "../src/lib/offline";
import { secureTokenStore } from "../src/lib/secure";
import { useQueryClient } from "@tanstack/react-query";
import { colors } from "../src/theme/colors";
import { radius, space } from "../src/theme/spacing";
import { fonts, type } from "../src/theme/typography";

export default function StoreDocument() {
  const { folder: preset } = useLocalSearchParams<{ folder?: Folder }>();
  const profiles = useProfiles();
  const qc = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<{ base64: string; type: string } | null>(null);
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState<Folder>(preset ?? "identity");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [keepOffline, setKeepOffline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const who = profileId ?? profiles.data?.find((p) => p.relation === "self")?.id ?? null;

  const pick = async (from: "camera" | "library") => {
    if (from === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert("Camera needed", "Allow the camera to snap your document.");
    }
    const res = from === "camera"
      ? await ImagePicker.launchCameraAsync({ quality: 0.75, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.75, base64: true });
    const a = !res.canceled ? res.assets[0] : null;
    if (a?.base64) {
      setPhoto(a.uri);
      setPhotoData({ base64: a.base64, type: a.mimeType ?? "image/jpeg" });
    } else if (a) {
      Alert.alert("Couldn't read that photo", "Please try another one.");
    }
  };

  const save = async () => {
    if (!photo || !photoData || !who) return;
    setSaving(true);
    setError(null);
    try {
      const doc = await api.documents.uploadBase64({
        data_base64: photoData!.base64, content_type: photoData!.type,
        profile_id: who, title: title.trim(), folder, keep_offline: keepOffline,
      });
      if (keepOffline && offlineAvailable()) {
        const t = await secureTokenStore.get();
        if (t) await downloadForOffline(api.documents.fileUrl(doc.id), t.access_token, { id: doc.id, title: doc.title }).catch(() => undefined);
      }
      qc.invalidateQueries({ queryKey: ["docs"] });
      qc.invalidateQueries({ queryKey: ["emergency"] });
      router.back();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg }}>
        <CircleButton icon="x" label="Close" onPress={() => router.back()} />
        <Text style={[type.h2, { fontSize: 22 }]}>Store a document</Text>
      </View>

      {photo ? (
        <View>
          <Image source={{ uri: photo }} resizeMode="contain" accessibilityLabel="Your photo"
            style={{ height: 260, borderRadius: radius.md, backgroundColor: colors.dark }} />
          <Pressable onPress={() => { setPhoto(null); setPhotoData(null); }} style={{ alignSelf: "center", padding: space.md }}>
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.primary }}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: space.lg }}>
          <Pressable onPress={() => pick("camera")} accessibilityRole="button"
            style={{ flex: 1, height: 110, borderRadius: radius.md, backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Feather name="camera" size={26} color="#fff" />
            <Text style={{ fontFamily: fonts.bodyBold, color: "#fff" }}>Snap it</Text>
          </Pressable>
          <Pressable onPress={() => pick("library")} accessibilityRole="button"
            style={{ flex: 1, height: 110, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Feather name="image" size={26} color={colors.primary} />
            <Text style={{ fontFamily: fonts.bodyBold, color: colors.ink }}>From photos</Text>
          </Pressable>
        </View>
      )}

      <TextField label="What is it?" value={title} onChangeText={setTitle} placeholder="e.g. Title deed, Degree certificate" />

      <Text style={[type.small, { marginBottom: 8 }]}>Folder</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginBottom: space.md }}>
        {FOLDERS.map((f) => <Chip key={f.key} label={f.label} active={folder === f.key} onPress={() => setFolder(f.key)} />)}
      </View>

      {profiles.data && profiles.data.length > 1 ? (
        <>
          <Text style={[type.small, { marginBottom: 8 }]}>Whose is it?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md }}>
            {profiles.data.map((p) => (
              <Chip key={p.id} label={p.relation === "self" ? "Me" : p.name} active={who === p.id} onPress={() => setProfileId(p.id)} />
            ))}
          </ScrollView>
        </>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.lg }}>
        <View style={{ flex: 1, paddingRight: space.md }}>
          <Text style={type.body}>Keep a copy on this phone</Text>
          <Text style={type.small}>Opens with no internet, still encrypted.</Text>
        </View>
        <Switch value={keepOffline} onValueChange={setKeepOffline} trackColor={{ true: colors.accent }} accessibilityLabel="Keep a copy on this phone" />
      </View>

      {error ? <ErrorNote error={error} /> : null}
      <Button title="Store it" onPress={save} loading={saving} disabled={!photo || !title.trim() || !who} />
      <Text style={[type.small, { textAlign: "center", marginTop: space.md }]}>Encrypted before it's stored. Only you can open it.</Text>
    </Screen>
  );
}
