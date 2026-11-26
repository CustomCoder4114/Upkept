/** Camera: snap a document, read its text on the phone, send only the text to the backend. */
import { Feather } from "@expo/vector-icons";
import type { ScanResult } from "@upkept/api-client";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../src/api/client";
import { Button } from "../../src/components/ui";
import { readText } from "../../src/lib/ocr";
import { useApp } from "../../src/store";
import { colors } from "../../src/theme/colors";
import { fonts, type } from "../../src/theme/typography";

const EMPTY = { value: null, confidence: 0 };

function emptyResult(warning?: string): ScanResult {
  return {
    kind: { value: "other", confidence: 0 }, category: { value: "personal", confidence: 0 },
    title: EMPTY, issuer: EMPTY, number: EMPTY, starts_on: EMPTY, ends_on: EMPTY, amount: EMPTY, currency: EMPTY,
    provider: "manual", warnings: warning ? [warning] : [], reminder_days: [30, 7, 1], ai_scans_left: null,
  };
}

export default function ScanScreen() {
  const { renew } = useLocalSearchParams<{ renew?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);
  const setPendingScan = useApp((s) => s.setPendingScan);

  const handlePhoto = async (uri: string, base64?: string | null, mime?: string | null) => {
    setError(null);
    try {
      setBusy("Reading the text…");
      let text = "";
      try {
        text = await readText(uri);
      } catch {
        text = ""; // the phone couldn't read it: carry on, the person types the details
      }
      setBusy("Finding the dates…");
      const result = text.trim() ? await api.scan(text) : emptyResult("We couldn't read the text. Please fill in the details.");
      setPendingScan({ photoUri: uri, photoBase64: base64 ?? undefined, photoType: mime ?? "image/jpeg", result, renewItemId: renew });
      router.replace("/add/confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that. Try again in better light.");
    } finally {
      setBusy(null);
    }
  };

  const snap = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.7, base64: true });
    if (photo?.uri) handlePhoto(photo.uri, photo.base64, "image/jpeg");
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7, base64: true });
    if (!res.canceled && res.assets[0]) handlePhoto(res.assets[0].uri, res.assets[0].base64, res.assets[0].mimeType);
  };

  const typeIt = () => {
    setPendingScan({
      photoUri: "",
      renewItemId: renew,
      result: emptyResult(),
    });
    router.replace("/add/confirm");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.round} accessibilityLabel="Close">
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" }}>{renew ? "Snap the new one" : "Add an item"}</Text>
        <Pressable onPress={() => setTorch((t) => !t)} style={styles.round} accessibilityLabel="Torch">
          <Feather name={torch ? "zap-off" : "zap"} size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={{ flex: 1, margin: 20, borderRadius: 20, overflow: "hidden" }}>
        {permission?.granted ? (
          <CameraView ref={camera} style={{ flex: 1 }} facing="back" enableTorch={torch} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={[type.body, { color: "#fff", textAlign: "center", marginBottom: 16 }]}>
              Upkept needs the camera to snap your documents. Photos stay private.
            </Text>
            <Button title="Allow camera" onPress={requestPermission} />
          </View>
        )}
        {busy ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }]}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: "#fff", fontFamily: fonts.bodyMedium, marginTop: 10 }}>{busy}</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={{ color: "#FFB4AE", textAlign: "center", marginHorizontal: 20 }}>{error}</Text> : null}

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 20 }}>
        <Pressable onPress={fromGallery} accessibilityLabel="Choose from photos"><Feather name="image" size={24} color="#fff" /></Pressable>
        <Pressable onPress={snap} disabled={!permission?.granted || !!busy} accessibilityLabel="Take photo"
          style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" }} />
        </Pressable>
        <Pressable onPress={typeIt} accessibilityLabel="Type it in instead"><Feather name="edit-3" size={24} color="#fff" /></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8 },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2B2C2F", alignItems: "center", justifyContent: "center" },
});
