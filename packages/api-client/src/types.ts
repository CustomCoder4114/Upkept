/**
 * API shapes, mirroring backend/app/schemas.
 *
 * Phase 1: written by hand. Once the backend runs, `npm run generate` writes
 * src/schema.ts from FastAPI's /openapi.json; switch these to the generated types then.
 */

export type Urgency = "green" | "amber" | "red" | "expired" | "charge" | "none";
export type Bucket = "needs_you" | "coming_up" | "later" | "undated";
export type Category =
  | "identity" | "travel" | "vehicles" | "home" | "insurance" | "health"
  | "money" | "work" | "school" | "purchases" | "digital" | "personal";
export type Recurrence = "none" | "monthly" | "yearly";
export type ItemStatus = "active" | "renewing" | "not_renewing" | "archived";

export interface Tokens { access_token: string; refresh_token: string; token_type: string }

export interface User {
  id: string; email: string; name: string; country: string;
  timezone: string; currency: string; language: string; plan: "free" | "premium" | "family";
}

export interface RegisterIn {
  email: string; password: string; name: string; country: string;
  timezone?: string; currency?: string; language?: string;
}

export interface Profile {
  id: string; name: string; relation: "self" | "child" | "partner" | "parent" | "other";
  date_of_birth: string | null; nationality: string | null;
}
export type ProfileIn = Omit<Profile, "id">;

export interface Item {
  id: string; profile_id: string; category: Category; kind: string; title: string;
  issuer: string | null; country: string | null; destination: string | null; number_last4: string | null;
  starts_on: string | null; ends_on: string | null; amount_minor: number | null; currency: string | null;
  recurrence: Recurrence; status: ItemStatus; notes: string | null; checklist_done: string[];
  days_left: number | null; urgency: Urgency; bucket: Bucket; reminder_dates: string[];
}

export interface ItemIn {
  profile_id: string; category: Category; kind: string; title: string;
  issuer?: string | null; country?: string | null; destination?: string | null; number?: string | null;
  starts_on?: string | null; ends_on?: string | null; amount_minor?: number | null; currency?: string | null;
  recurrence?: Recurrence; notes?: string | null;
}

export type ItemPatch = Partial<Omit<ItemIn, "profile_id" | "category" | "kind">> & {
  status?: ItemStatus; checklist_done?: string[];
};

export interface Timeline {
  score: number;
  suggestions: { text: string; points: number }[];
  needs_you: Item[]; coming_up: Item[]; later: Item[]; undated: Item[];
}

export interface DocumentMeta {
  id: string; profile_id: string; item_id: string | null; title: string; content_type: string;
  size_bytes: number; version: number; is_current: boolean; keep_offline: boolean; created_at: string;
}

export interface ScanField { value: string | null; confidence: number }
export interface ScanResult {
  kind: ScanField; category: ScanField; title: ScanField; issuer: ScanField; number: ScanField;
  starts_on: ScanField; ends_on: ScanField; amount: ScanField; currency: ScanField;
  provider: string; warnings: string[]; reminder_days: number[]; ai_scans_left: number | null;
}

export interface Reminder {
  id: string; item_id: string; due_at: string; days_before: number; attempt: number;
  status: string; item_title: string;
}

export interface GuideStep { id: string; title: string; detail: string }
export interface Guide {
  country: string; item: string; title: string; summary: string; official_url: string;
  sources: { title: string; url: string; official: boolean }[];
  last_checked: string;
  cost: { amount: number | null; currency: string; note: string; verified: boolean };
  processing_time: string; renew_before_days: number | null;
  documents_needed: string[]; steps: GuideStep[]; tips: string[];
}

export interface Trip { id: string; destination: string; city: string | null; starts_on: string; ends_on: string }
export interface TripIn { destination: string; city?: string; starts_on: string; ends_on: string; traveller_ids: string[] }
export interface TripIssue {
  traveller: string; code: string; severity: "blocker" | "check" | "tip";
  message: string; detail: string; fix_by: string | null; guide_item: string | null;
}
export interface TripCheck {
  trip: Trip; status: "ready" | "check" | "not_ready"; issues: TripIssue[];
  ready_travellers: string[]; rule_verified: boolean; rule_source_url: string | null;
}

export interface MoneySummary {
  totals: Record<string, { monthly_minor: number; yearly_minor: number; by_category: Record<string, number> }>;
  upcoming: { title: string; amount_minor: number; currency: string; on: string }[];
}
