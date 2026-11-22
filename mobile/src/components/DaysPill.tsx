import type { Urgency } from "@upkept/api-client";
import { Text, View } from "react-native";

import { radius } from "../theme/spacing";
import { fonts } from "../theme/typography";
import { daysLabel, urgencyStyle } from "../theme/urgency";

/** "3 days" / "41 days" pill. Colour comes from urgency, never from the number. */
export function DaysPill({ days, urgency, text }: { days: number | null; urgency: Urgency; text?: string }) {
  const s = urgencyStyle[urgency];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: s.fg }}>{text ?? daysLabel(days)}</Text>
    </View>
  );
}

export function StatusPill({ urgency }: { urgency: Urgency }) {
  const s = urgencyStyle[urgency];
  return <DaysPill days={null} urgency={urgency} text={s.label} />;
}
