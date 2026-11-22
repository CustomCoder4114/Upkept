import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

import { unlock } from "../lib/biometrics";
import { useApp } from "../store";
import { colors } from "../theme/colors";
import { type } from "../theme/typography";
import { Button } from "./ui";

/** Covers the app until the user unlocks with face, fingerprint or the phone PIN. */
export function LockOverlay() {
  const setLocked = useApp((s) => s.setLocked);

  const tryUnlock = async () => {
    if (await unlock()) setLocked(false);
  };

  useEffect(() => {
    tryUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.dark, alignItems: "center", justifyContent: "center", padding: 32 }]}>
      <Feather name="lock" size={36} color={colors.onDark} />
      <Text style={[type.h2, { color: colors.onDark, marginTop: 16 }]}>Upkept is locked</Text>
      <Text style={[type.small, { color: colors.onDarkSoft, marginTop: 6, marginBottom: 28, textAlign: "center" }]}>
        Your documents are protected.
      </Text>
      <Button title="Unlock" onPress={tryUnlock} style={{ alignSelf: "stretch" }} />
    </View>
  );
}
