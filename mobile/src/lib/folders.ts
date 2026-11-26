/** Vault folders. */
import type { Folder } from "@upkept/api-client";

import type { IconName } from "../components/ui";

export const FOLDERS: { key: Folder; label: string; icon: IconName; hint: string }[] = [
  { key: "identity", label: "Identity", icon: "credit-card", hint: "ID, passport, birth certificate" },
  { key: "property", label: "Property", icon: "home", hint: "Title deeds, lease, house papers" },
  { key: "vehicles", label: "Vehicles", icon: "truck", hint: "Logbook, licence, insurance" },
  { key: "education", label: "Education", icon: "book-open", hint: "Certificates, transcripts" },
  { key: "medical", label: "Medical", icon: "heart", hint: "Records, prescriptions, cover" },
  { key: "money", label: "Money", icon: "dollar-sign", hint: "Tax, bank letters, receipts" },
  { key: "family", label: "Family", icon: "users", hint: "Marriage, wills, children's papers" },
  { key: "other", label: "Other", icon: "folder", hint: "Anything else important" },
];

export const folderLabel = (key?: string) => FOLDERS.find((f) => f.key === key)?.label ?? "Other";

/** Which folder a document linked to an item belongs in, from the item's category. */
export function folderForCategory(category?: string): Folder {
  switch (category) {
    case "identity":
    case "travel":
      return "identity";
    case "home":
      return "property";
    case "vehicles":
      return "vehicles";
    case "health":
      return "medical";
    case "school":
      return "education";
    case "money":
    case "insurance":
    case "purchases":
      return "money";
    default:
      return "other";
  }
}
