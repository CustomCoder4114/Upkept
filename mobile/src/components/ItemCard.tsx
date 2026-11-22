import type { Item } from "@upkept/api-client";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { initials, money, shortDate } from "../lib/format";
import { colors } from "../theme/colors";
import { radius, space } from "../theme/spacing";
import { fonts, type } from "../theme/typography";
import { daysLabel, urgencyStyle } from "../theme/urgency";
import { DaysPill } from "./DaysPill";

function subtitle(item: Item, ownerName?: string) {
  const who = ownerName ? `${ownerName} · ` : "";
  if (item.recurrence !== "none" && item.amount_minor != null && item.ends_on) {
    return `${who}Charges ${money(item.amount_minor, item.currency)} on ${shortDate(item.ends_on, false)}`;
  }
  if (item.kind === "warranty" && item.ends_on) return `${who}Ends ${shortDate(item.ends_on, false)} · claim before`;
  if (item.amount_minor != null) {
    return `${who}${item.issuer ?? ""}${item.issuer ? " · " : ""}${money(item.amount_minor, item.currency)} a year`;
  }
  return `${who}${item.issuer ?? (item.ends_on ? `Ends ${shortDate(item.ends_on)}` : "No end date")}`;
}

/** "Needs you" card: initials avatar + days pill. */
export function ItemCard({ item, ownerName }: { item: Item; ownerName?: string }) {
  const s = urgencyStyle[item.urgency];
  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${daysLabel(item.days_left)}`}
      style={{
        flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border, padding: space.lg, marginBottom: space.sm,
      }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: s.bg, alignItems: "center",
        justifyContent: "center", marginRight: space.md }}>
        <Text style={{ fontFamily: fonts.bodyBold, color: s.fg }}>{initials(item.title)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{item.title}</Text>
        <Text style={type.small} numberOfLines={1}>{subtitle(item, ownerName)}</Text>
      </View>
      <DaysPill days={item.days_left} urgency={item.urgency} />
    </Pressable>
  );
}

/** "Coming up" row: coloured dot, title, days on the right. */
export function ItemRow({ item, last, ownerName }: { item: Item; last?: boolean; ownerName?: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/item/${item.id}`)}
      accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: space.md, paddingHorizontal: space.lg,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: urgencyStyle[item.urgency].dot,
        marginRight: space.md }} />
      <View style={{ flex: 1 }}>
        <Text style={type.h3}>{item.title}</Text>
        <Text style={type.small} numberOfLines={1}>{subtitle(item, ownerName)}</Text>
      </View>
      <Text style={[type.body, { color: colors.ink }]}>{daysLabel(item.days_left)}</Text>
    </Pressable>
  );
}
