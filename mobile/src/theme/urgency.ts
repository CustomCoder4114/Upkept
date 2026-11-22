/**
 * The ONE place that decides what each urgency looks like, so red/amber/green
 * mean the same thing on every screen. The urgency itself is computed by the
 * backend (reminder_rules.urgency), never in the app.
 */
import type { Urgency } from "@upkept/api-client";

import { colors } from "./colors";

export const urgencyStyle: Record<Urgency, { fg: string; bg: string; dot: string; label: string }> = {
  green: { fg: colors.mintText, bg: colors.mint, dot: colors.accent, label: "On track" },
  amber: { fg: colors.amber, bg: colors.amberBg, dot: "#D98A1A", label: "Coming up" },
  red: { fg: colors.red, bg: colors.redBg, dot: colors.red, label: "Urgent" },
  expired: { fg: colors.red, bg: colors.redBg, dot: colors.red, label: "Expired" },
  charge: { fg: colors.neutralText, bg: colors.neutralBg, dot: colors.inkMuted, label: "Charges soon" },
  none: { fg: colors.inkSoft, bg: colors.neutralBg, dot: colors.border, label: "No date" },
};

/** "3 days", "41 days", "5 months", "Expired 4 days ago". Same rule everywhere. */
export function daysLabel(days: number | null): string {
  if (days === null) return "No date";
  if (days < 0) return `Expired ${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 120) return `${days} days`; // "102 days" as in the design
  const months = Math.round(days / 30.44);
  return months >= 12 ? `${Math.floor(months / 12)} yr ${months % 12 ? `${months % 12} mo` : ""}`.trim() : `${months} months`;
}
