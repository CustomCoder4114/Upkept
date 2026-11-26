/** One row on the Home list: icon square, name, where it is, days pill. */
import { Feather } from "@expo/vector-icons";
import type { Item } from "@upkept/api-client";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { LOCATION_LABELS } from "../lib/format";
import { colors } from "../theme/colors";
import { space } from "../theme/spacing";
import { type } from "../theme/typography";
import { daysLabel, urgencyStyle } from "../theme/urgency";
import { DaysPill } from "./DaysPill";
import type { IconName } from "./ui";

export const HOME_ICONS: Record<string, IconName> = { kitchen: "shopping-bag", medicines: "plus-square", household: "home" };

export function homeSubtitle(item: Item, ownerName?: string): string {
  const parts = [
    item.location ? LOCATION_LABELS[item.location] ?? item.location : null,
    item.cycle_days ? "from past refills" : item.quantity,
    ownerName,
  ].filter(Boolean);
  return parts.join(" · ") || "No details";
}

export function homeDays(item: Item): string {
  if (item.days_left !== null && item.days_left < 0) return "Expired";
  return `${item.cycle_days ? "~" : ""}${daysLabel(item.days_left)}`;
}

export function HomeRow({ item, last, ownerName }: { item: Item; last?: boolean; ownerName?: string }) {
  const s = urgencyStyle[item.urgency];
  return (
    <Pressable
      onPress={() => router.push(`/home/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${homeDays(item)}`}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: s.bg, alignItems: "center", justifyContent: "center" }}>
        <Feather name={HOME_ICONS[item.category] ?? "box"} size={19} color={s.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={type.h3} numberOfLines={1}>{item.title}</Text>
        <Text style={type.small} numberOfLines={1}>{homeSubtitle(item, ownerName)}</Text>
      </View>
      <DaysPill days={item.days_left} urgency={item.urgency} text={homeDays(item)} />
    </Pressable>
  );
}
