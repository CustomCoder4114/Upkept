/** Amounts are stored in minor units (cents). Shown in the item's own currency. */
export function money(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor == null) return "";
  const value = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "KES",
      maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${currency ?? ""} ${value.toLocaleString()}`.trim();
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December"];

/** "2027-03-03" -> "3 Mar 2027" (dates are plain calendar dates, never shifted by time zone). */
export function shortDate(iso: string | null | undefined, withYear = true): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function longDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/**
 * What people type into a date field -> "YYYY-MM-DD", or null.
 * Accepts "3 March 2027", "3 Mar 2027", "03/03/2027" (day first), "2027-03-03".
 */
export function parseDateInput(text: string): string | null {
  const t = text.trim();
  const pad = (n: number) => String(n).padStart(2, "0");
  const valid = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  m = t.match(/^([A-Za-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/); // "December 24, 2026"
  if (m) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m![1].slice(0, 3).toLowerCase());
    if (month >= 0) return valid(+m[3], month + 1, +m[2]);
  }
  m = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS.findIndex((x) => x.toLowerCase() === m![2].slice(0, 3).toLowerCase());
    return month >= 0 ? valid(+m[3], month + 1, +m[1]) : null;
  }
  return null;
}

/** "42,000" or "42000.50" -> minor units (4200000), or null. */
export function parseAmountInput(text: string): number | null {
  const cleaned = text.replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

/** Share of the period already used, for the progress bar. */
export function progress(startsOn: string | null, endsOn: string | null, today = new Date()): number {
  if (!startsOn || !endsOn) return 0;
  const s = Date.parse(startsOn);
  const e = Date.parse(endsOn);
  if (!(e > s)) return 0;
  return Math.min(1, Math.max(0, (today.getTime() - s) / (e - s)));
}

export function initials(text: string): string {
  return text.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export const COUNTRY_NAMES: Record<string, string> = {
  KE: "Kenya", GB: "United Kingdom", US: "United States", TH: "Thailand", AE: "United Arab Emirates",
  UG: "Uganda", TZ: "Tanzania", RW: "Rwanda", NG: "Nigeria", ZA: "South Africa", AG: "Antigua and Barbuda",
};

/**
 * Find the "use by" date in text read from a label: "EXP 12/2027", "BEST BEFORE 26.11.26",
 * "USE BY 26 NOV 2026", "2026-11-26". Month-only dates mean the end of that month.
 * Prefers a date right after an expiry word; otherwise the latest date found.
 */
export function findDateInText(text: string): string | null {
  const t = text.toUpperCase().replace(/O(?=\d)|(?<=\d)O/g, "0"); // OCR often reads 0 as O
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = (y: number) => (y < 100 ? 2000 + y : y);
  const make = (y: number, m: number, d: number) => {
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2000 && y <= 2100
      ? `${y}-${pad(m)}-${pad(d)}` : null;
  };
  const endOfMonth = (y: number, m: number) => make(y, m, new Date(Date.UTC(y, m, 0)).getUTCDate());
  const months = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";
  const found: { at: number; iso: string }[] = [];
  const add = (at: number, iso: string | null) => { if (iso) found.push({ at, iso }); };

  for (const m of t.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) add(m.index!, make(+m[1], +m[2], +m[3]));
  for (const m of t.matchAll(/\b(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2,4})\b/g)) add(m.index!, make(year(+m[3]), +m[2], +m[1]));
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2})\\s*(${months})[A-Z]*\\.?\\s*(\\d{2,4})\\b`, "g"))) {
    add(m.index!, make(year(+m[3]), months.split("|").indexOf(m[2]) + 1, +m[1]));
  }
  for (const m of t.matchAll(new RegExp(`\\b(${months})[A-Z]*\\.?\\s*(\\d{4})\\b`, "g"))) {
    add(m.index!, endOfMonth(+m[2], months.split("|").indexOf(m[1]) + 1));
  }
  for (const m of t.matchAll(/(?<![\d/.-])(\d{1,2})[/.](\d{4})\b/g)) add(m.index!, endOfMonth(+m[2], +m[1]));
  if (!found.length) return null;

  const label = /(EXP|EXPIRY|EXPIRES|BEST BEFORE|BB|USE BY|USE BEFORE|BBE)\W{0,4}$/;
  const labelled = found.filter((f) => label.test(t.slice(Math.max(0, f.at - 16), f.at)));
  const pool = labelled.length ? labelled : found;
  return pool.map((f) => f.iso).sort().at(-1)!;
}

export const LOCATION_LABELS: Record<string, string> = {
  fridge: "Fridge", cupboard: "Cupboard", freezer: "Freezer", medicine_box: "Medicine box",
  first_aid: "First-aid box", household: "Household",
};
