/**
 * Home list camera, two modes:
 *  - barcode: reads the product barcode and looks up its name (Open Food Facts, free)
 *  - date: snaps the "best before / use by / EXP" print and finds the date on the phone
 * Either way it hands the result back to Quick add and closes.
 */
import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../src/components/ui";
import { findDateInText } from "../../src/lib/format";
import { readText } from "../../src/lib/ocr";
import { useApp } from "../../src/store";
import { colors } from "../../src/theme/colors";
import { fonts, type } from "../../src/theme/typography";

async function productName(code: string): Promise<string | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name`, {
      headers: { "User-Agent": "Upkept/0.1 (Android)" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.product?.product_name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

export default function HomeCamera() {
  const { mode } = useLocalSearchParams<{ mode: "barcode" | "date" }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);
  const camera = useRef<CameraView>(null);
  const setDraft = useApp((s) => s.setHomeDraft);
  const isBarcode = mode !== "date";

  const onBarcode = async ({ data }: { data: string }) => {
    if (handled.current) return;
    handled.current = true;
    setBusy("Looking up the product…");
    const name = await productName(data);
    setDraft(name ? { name } : { message: "We couldn't find that product's name. Please type it." });
    router.back();
  };

  const snapDate = async () => {
    setError(null);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      setBusy("Finding the date…");
      const found = findDateInText(await readText(photo.uri));
      if (found) {
        setDraft({ date: found });
        router.back();
      } else {
        setError("No date found. Get closer to the date print, or pick the date instead.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.dark }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Close"
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#2B2C2F", alignItems: "center", justifyContent: "center" }}>
          <Feather name="x" size={20} color="#fff" />
        </Pressable>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" }}>{isBarcode ? "Scan the barcode" : "Snap the date"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ flex: 1, margin: 20, borderRadius: 20, overflow: "hidden" }}>
        {permission?.granted ? (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={isBarcode ? { barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] } : undefined}
            onBarcodeScanned={isBarcode ? onBarcode : undefined}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={[type.body, { color: "#fff", textAlign: "center", marginBottom: 16 }]}>Upkept needs the camera for this.</Text>
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

      <Text style={{ color: "#C9C9C9", textAlign: "center", marginHorizontal: 24, fontFamily: fonts.body }}>
        {isBarcode ? "Point at the barcode. It scans by itself." : "Fill the frame with the date print (EXP, Best before, Use by)."}
      </Text>
      {error ? <Text style={{ color: "#FFB4AE", textAlign: "center", margin: 12 }}>{error}</Text> : null}

      {!isBarcode ? (
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Pressable onPress={snapDate} disabled={!permission?.granted || !!busy} accessibilityLabel="Take photo"
            style={{ width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" }} />
          </Pressable>
        </View>
      ) : <View style={{ height: 40 }} />}
    </SafeAreaView>
  );
}
