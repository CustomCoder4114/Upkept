/**
 * Reads the same /content/guides JSON the backend uses, at build time.
 * Every guide becomes a static page that search engines can index.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Guide } from "@upkept/api-client";

const GUIDES_DIR = path.join(process.cwd(), "..", "content", "guides");

export const COUNTRY_NAMES: Record<string, string> = { ke: "Kenya" };

export function allGuides(): Guide[] {
  return readdirSync(GUIDES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(path.join(GUIDES_DIR, d.name))
        .filter((f) => f.endsWith(".json"))
        .map((f) => JSON.parse(readFileSync(path.join(GUIDES_DIR, d.name, f), "utf8")) as Guide),
    );
}

export function guideSlug(g: Guide) {
  return { country: g.country.toLowerCase(), item: g.item.replace(/_/g, "-") };
}

export function findGuide(country: string, item: string): Guide | undefined {
  return allGuides().find((g) => g.country.toLowerCase() === country && g.item === item.replace(/-/g, "_"));
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];

export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
