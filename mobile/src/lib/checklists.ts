/**
 * "Get it done" steps. A country guide's steps are used when one exists;
 * otherwise these general checklists apply, per item kind.
 */
import type { Item } from "@upkept/api-client";

import { money } from "./format";

export interface Step {
  id: string;
  title: string;
  detail: string;
}

export function fallbackSteps(item: Item): Step[] {
  const paid = item.amount_minor != null ? `Last time you paid ${money(item.amount_minor, item.currency)}. ` : "";
  const issuer = item.issuer ?? "the provider";
  const snap: Step = { id: "snap", title: "Snap the new document", detail: "Your reminders reset to the new end date." };

  if (item.category === "insurance" || item.kind.endsWith("_insurance")) {
    return [
      { id: "compare", title: "Compare quotes", detail: `${paid}Check if you can pay less.` },
      { id: "renew", title: `Renew with ${issuer}`, detail: "Online or at a branch. Have your policy number ready." },
      { id: "pay", title: "Pay the premium", detail: "Keep the receipt; snap it into Upkept too." },
      { ...snap, title: "Snap the new certificate" },
    ];
  }
  if (item.kind === "warranty") {
    return [
      { id: "check", title: "Check what's covered", detail: "Find the warranty terms and the receipt (both are in your vault)." },
      { id: "contact", title: `Contact ${issuer}`, detail: "Describe the fault. Ask how to send or bring the item in." },
      { id: "bring", title: "Bring the receipt and warranty", detail: "Show them from Upkept, even offline." },
    ];
  }
  if (item.kind === "subscription" || item.recurrence !== "none") {
    return [
      { id: "decide", title: "Still using it?", detail: `${paid}Decide before it charges again.` },
      { id: "cancel", title: "Cancel if not", detail: `Cancel in your ${issuer} account settings, before the charge date.` },
      { id: "confirm", title: "Keep the confirmation", detail: "Snap or forward the cancellation email." },
    ];
  }
  return [
    { id: "check", title: "Check what you need", detail: "Find the requirements on the official site." },
    { id: "apply", title: "Apply or renew", detail: `With ${issuer}.` },
    snap,
  ];
}

export const CATEGORY_LABELS: Record<string, string> = {
  identity: "Identity", travel: "Travel", vehicles: "Vehicles", home: "Home", insurance: "Insurance",
  health: "Health", money: "Money", work: "Work", school: "School", purchases: "Purchases", digital: "Digital",
  personal: "Personal",
};

/** Insurance on a car is shown under Vehicles, as in the design. */
export function breadcrumb(item: Item): string {
  const area = item.kind === "car_insurance" ? "Vehicles" : CATEGORY_LABELS[item.category] ?? item.category;
  return item.issuer ? `${area} · ${item.issuer}` : area;
}
