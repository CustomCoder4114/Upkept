import { Feather } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import { Pressable, View } from "react-native";

import { colors } from "../../src/theme/colors";
import { fonts } from "../../src/theme/typography";

/** Bottom menu: Timeline, Vault, [+], Money, Family. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        tabBarStyle: { height: 84, paddingTop: 8, borderTopColor: colors.border, backgroundColor: colors.card },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Timeline", tabBarIcon: ({ color }) => <Feather name="calendar" size={22} color={color} /> }} />
      <Tabs.Screen name="vault" options={{ title: "Vault", tabBarIcon: ({ color }) => <Feather name="lock" size={22} color={color} /> }} />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: "center" }}>
              <Pressable
                onPress={() => router.push("/add/scan")}
                accessibilityRole="button"
                accessibilityLabel="Add an item"
                style={{ width: 60, height: 60, borderRadius: 20, marginTop: -22, backgroundColor: colors.primary,
                  alignItems: "center", justifyContent: "center" }}
              >
                <Feather name="plus" size={28} color="#fff" />
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: ({ color }) => <Feather name="credit-card" size={22} color={color} /> }} />
      <Tabs.Screen name="family" options={{ title: "Family", tabBarIcon: ({ color }) => <Feather name="users" size={22} color={color} /> }} />
    </Tabs>
  );
}
