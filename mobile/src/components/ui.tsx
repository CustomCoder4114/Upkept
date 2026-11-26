/** Small building blocks used on every screen. */
import { Feather } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { radius, space } from "../theme/spacing";
import { type } from "../theme/typography";

export type IconName = ComponentProps<typeof Feather>["name"];

/** bottomSafe: true for screens outside the tab bar, so content isn't under the phone's navigation buttons. */
export function Screen({ children, scroll = true, dark = false, bottomSafe = true }: {
  children: ReactNode; scroll?: boolean; dark?: boolean; bottomSafe?: boolean;
}) {
  const bg = dark ? colors.dark : colors.background;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={bottomSafe ? ["top", "bottom"] : ["top"]}>
      <KeyboardScroll scroll={scroll}>{children}</KeyboardScroll>
    </SafeAreaView>
  );
}

/**
 * Moves content up when the keyboard opens, so the box being typed in stays visible.
 * Use it for every screen with text boxes (Screen already does).
 */
export function KeyboardScroll({ children, scroll = true, contentStyle }: {
  children: ReactNode; scroll?: boolean; contentStyle?: ViewStyle;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, dark }: { children: ReactNode; style?: ViewStyle; dark?: boolean }) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

export function CircleButton({ icon, onPress, label, badge }: {
  icon: IconName; onPress: () => void; label: string; badge?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.circle} hitSlop={8}>
      <Feather name={icon} size={20} color={colors.ink} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style }: {
  title: string; onPress: () => void; variant?: "primary" | "light" | "outline"; loading?: boolean;
  disabled?: boolean; icon?: IconName; style?: ViewStyle;
}) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, v.box, (pressed || disabled) && { opacity: 0.7 }, style]}
    >
      {loading ? <ActivityIndicator color={v.text} /> : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={18} color={v.text} style={{ marginRight: 8 }} /> : null}
          <Text style={[type.button, { color: v.text }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { box: { backgroundColor: colors.primary }, text: colors.primaryText },
  light: { box: { backgroundColor: "#F3EFE6" }, text: colors.ink },
  outline: { box: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }, text: colors.ink },
};

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[type.h3, { fontSize: 14, color: active ? colors.onDark : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={[type.label, { marginTop: space.xl, marginBottom: space.sm }]}>{children.toUpperCase()}</Text>;
}

export function Loading() {
  return (
    <View style={{ padding: space.xxl, alignItems: "center" }}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Card style={{ backgroundColor: colors.redBg, borderColor: colors.redBg }}>
      <Text style={[type.body, { color: colors.red }]}>{error instanceof Error ? error.message : "Something went wrong"}</Text>
      {onRetry ? <Text onPress={onRetry} style={[type.h3, { color: colors.red, marginTop: 8 }]}>Try again</Text> : null}
    </Card>
  );
}

export const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: 120 },
  row: { flexDirection: "row", alignItems: "center" },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: space.xl,
    borderWidth: 1, borderColor: colors.border,
  },
  cardDark: { backgroundColor: colors.dark, borderColor: colors.dark },
  circle: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: "center",
    justifyContent: "center", borderWidth: 1, borderColor: colors.border,
  },
  badge: { position: "absolute", top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: "#D9541E" },
  button: { height: 54, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  chip: {
    paddingHorizontal: space.lg, height: 40, borderRadius: radius.pill, justifyContent: "center",
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: space.sm,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
});
