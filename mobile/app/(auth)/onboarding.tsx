import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { api } from "../../src/api/client";
import { Button, Card, Chip, Screen } from "../../src/components/ui";
import { enableNotifications } from "../../src/lib/notifications";
import { colors } from "../../src/theme/colors";
import { space } from "../../src/theme/spacing";
import { type } from "../../src/theme/typography";

/** Suggested first three items, by country. */
const FIRST_THREE: Record<string, { icon: "credit-card" | "globe" | "smartphone" | "shield"; title: string }[]> = {
  KE: [
    { icon: "credit-card", title: "National ID" },
    { icon: "globe", title: "Passport" },
    { icon: "shield", title: "Car or medical insurance" },
  ],
};

export default function Onboarding() {
  const [step, setStep] = useState<"who" | "three" | "notify">("who");
  const [forFamily, setForFamily] = useState(false);
  const [asking, setAsking] = useState(false);

  if (step === "who") {
    return (
      <Screen>
        <Text style={[type.title, { marginTop: 40 }]}>Who is Upkept for?</Text>
        <Text style={[type.body, { color: colors.inkSoft, marginVertical: 12 }]}>You can add family members any time.</Text>
        <View style={{ flexDirection: "row", marginVertical: 16 }}>
          <Chip label="Just me" active={!forFamily} onPress={() => setForFamily(false)} />
          <Chip label="Me and my family" active={forFamily} onPress={() => setForFamily(true)} />
        </View>
        <Button title="Continue" onPress={() => setStep("three")} />
      </Screen>
    );
  }

  if (step === "three") {
    return (
      <Screen>
        <Text style={[type.title, { marginTop: 40 }]}>Let's start with your 3 most important things</Text>
        <Text style={[type.body, { color: colors.inkSoft, marginVertical: 12 }]}>
          Snap each one. We read the dates, and you check them.
        </Text>
        {FIRST_THREE.KE.map((t) => (
          <Card key={t.title} style={{ flexDirection: "row", alignItems: "center", marginBottom: space.sm, padding: space.lg }}>
            <Feather name={t.icon} size={20} color={colors.primary} style={{ marginRight: space.md }} />
            <Text style={type.h3}>{t.title}</Text>
          </Card>
        ))}
        <Button title="Continue" onPress={() => setStep("notify")} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Feather name="bell" size={36} color={colors.primary} style={{ marginTop: 48 }} />
      <Text style={[type.title, { marginTop: 16 }]}>Turn on reminders</Text>
      <Text style={[type.body, { color: colors.inkSoft, marginVertical: 12 }]}>
        So we can warn you before anything expires. We'll send one test reminder to check it works.
      </Text>
      <Button
        title="Turn on reminders"
        loading={asking}
        onPress={async () => {
          setAsking(true);
          try {
            if (await enableNotifications()) await api.reminders.sendTest();
          } finally {
            setAsking(false);
            router.replace(forFamily ? "/(tabs)/family" : "/add/scan");
          }
        }}
      />
      <Button title="Not now" variant="outline" onPress={() => router.replace("/add/scan")} style={{ marginTop: 12 }} />
      <Text style={[type.small, { marginTop: 16 }]}>We'll also email you, in case notifications are blocked.</Text>
    </Screen>
  );
}
