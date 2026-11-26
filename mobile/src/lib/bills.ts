/** Bill types: the Money tab's starter buttons and the "What kind?" choice when adding one. */
import type { Category, Recurrence, SpendGroup } from "@upkept/api-client";

import type { IconName } from "../components/ui";

export interface BillType {
  key: string;
  label: string;
  name: string; // pre-filled name ("" = the person types it)
  group: SpendGroup;
  category: Category;
  kind: string;
  recurrence: Recurrence;
  icon: IconName;
}

export const BILL_TYPES: BillType[] = [
  { key: "rent", label: "Rent", name: "Rent", group: "rent", category: "money", kind: "subscription", recurrence: "monthly", icon: "home" },
  { key: "electricity", label: "Electricity", name: "Electricity", group: "utilities", category: "money", kind: "subscription", recurrence: "monthly", icon: "zap" },
  { key: "internet", label: "Internet", name: "Home internet", group: "internet_phone", category: "money", kind: "subscription", recurrence: "monthly", icon: "wifi" },
  { key: "phone", label: "Phone plan", name: "Phone plan", group: "internet_phone", category: "money", kind: "subscription", recurrence: "monthly", icon: "smartphone" },
  { key: "streaming", label: "Streaming", name: "", group: "entertainment", category: "digital", kind: "subscription", recurrence: "monthly", icon: "tv" },
  { key: "gym", label: "Gym", name: "Gym membership", group: "fitness", category: "money", kind: "subscription", recurrence: "monthly", icon: "activity" },
  { key: "school", label: "School fees", name: "School fees", group: "school", category: "school", kind: "school_fees", recurrence: "yearly", icon: "book-open" },
  { key: "insurance", label: "Insurance", name: "", group: "insurance", category: "insurance", kind: "insurance", recurrence: "yearly", icon: "shield" },
  { key: "other", label: "Other", name: "", group: "other", category: "money", kind: "subscription", recurrence: "monthly", icon: "more-horizontal" },
];

export const billType = (key?: string) => BILL_TYPES.find((b) => b.key === key);
