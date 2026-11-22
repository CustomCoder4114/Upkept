/** Camera: snap a document, read its text on the phone, send only the text to the backend. */
import { Feather } from "@expo/vector-icons";
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

export default function ScanScreen() {
  const { renew } = useLocalSearchParams<{ renew?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);
  const setPendingScan = useApp((s) => s.setPendingScan);

  const handlePhoto = async (uri: string) => {
    setError(null);
    try {
      setBusy("Reading the text…");
      const text = await readText(uri);
      setBusy("Finding the dates…");
      const result = await api.scan(text);
      setPendingScan({ photoUri: uri, result, renewItemId: renew });
      router.replace("/add/confirm");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that. Try again in better light.");
    } finally {
      setBusy(null);
    }
  };

  const snap = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) handlePhoto(photo.uri);
  };

  const fromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!res.canceled && res.assets[0]) handlePhoto(res.assets[0].uri);
  };

  const typeIt = () => {
    setPendingScan({
      photoUri: "",
      renewItemId: renew,
      result: {
        kind: { value: "other", confidence: 0 }, category: { value: "personal", confidence: 0 },
        title: EMPTY, issuer: EMPTY, number: EMPTY, starts_on: EMPTY, ends_on: EMPTY, amount: EMPTY, currency: EMPTY,
        provider: "manual", warnings: [], reminder_days: [30, 7, 1], ai_scans_left: null,
      },
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
