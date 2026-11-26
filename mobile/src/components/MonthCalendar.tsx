/** A month grid with coloured dots on days that have expiries or charges. */
import { Feather } from "@expo/vector-icons";
import type { CalendarEntry } from "@upkept/api-client";
import { Pressable, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { radius, space } from "../theme/spacing";
import { fonts, type } from "../theme/typography";
import { urgencyStyle } from "../theme/urgency";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const pad = (n: number) => String(n).padStart(2, "0");

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday-first grid: null for the blank cells before the 1st and after the last day. */
export function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
}

function dotColor(e: CalendarEntry) {
  return e.type === "charge" ? colors.inkMuted : urgencyStyle[e.urgency].dot;
}

export function MonthCalendar({ month, days, selected, onSelect, onMonth }: {
  month: string; days: Record<string, CalendarEntry[]>; selected: string | null;
  onSelect: (day: string) => void; onMonth: (month: string) => void;
}) {
  const [y, m] = month.split("-").map(Number);
  const cells = monthCells(month);
  const today = todayIso();

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space.sm }}>
        <Pressable onPress={() => onMonth(shiftMonth(month, -1))} accessibilityLabel="Previous month" hitSlop={10}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-left" size={20} color={colors.ink} />
        </Pressable>
        <Text style={type.h3}>{MONTHS[m - 1]} {y}</Text>
        <Pressable onPress={() => onMonth(shiftMonth(month, 1))} accessibilityLabel="Next month" hitSlop={10}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Feather name="chevron-right" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>
        {WEEK.map((w, i) => (
          <Text key={i} style={[type.small, { flex: 1, textAlign: "center", fontSize: 12 }]}>{w}</Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 48 }} />;
          const entries = days[day] ?? [];
          const isSel = day === selected;
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              onPress={() => onSelect(day)}
              accessibilityRole="button"
              accessibilityLabel={`${Number(day.slice(8))} ${MONTHS[m - 1]}${entries.length ? `, ${entries.length} due` : ""}`}
              style={{ width: `${100 / 7}%`, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
                backgroundColor: isSel ? colors.ink : "transparent", borderWidth: isToday && !isSel ? 1.5 : 0, borderColor: colors.primary }}>
                <Text style={{ fontFamily: entries.length ? fonts.bodyBold : fonts.body, fontSize: 14,
                  color: isSel ? colors.onDark : colors.ink }}>{Number(day.slice(8))}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 2, height: 6, marginTop: 1 }}>
                {entries.slice(0, 3).map((e, k) => (
                  <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dotColor(e) }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: space.lg, marginTop: space.sm }}>
        <Legend color={colors.red} label="Ends soon" />
        <Legend color="#D98A1A" label="Coming up" />
        <Legend color={colors.accent} label="On track" />
        <Legend color={colors.inkMuted} label="Charge" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={[type.small, { fontSize: 11 }]}>{label}</Text>
    </View>
  );
}
