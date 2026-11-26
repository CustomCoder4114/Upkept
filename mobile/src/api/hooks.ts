/** Server data through TanStack Query: caching, refetching and loading states in one place. */
import type { AccountIn, ItemIn, ItemPatch, ProfileIn, TripIn, UserPatch } from "@upkept/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./client";

export const keys = {
  me: ["me"] as const,
  profiles: ["profiles"] as const,
  timeline: (p?: string) => ["timeline", p ?? "all"] as const,
  item: (id: string) => ["item", id] as const,
  items: (q: object) => ["items", q] as const,
  docs: (q: object) => ["docs", q] as const,
  reminders: ["reminders"] as const,
  guide: (c: string, i: string) => ["guide", c, i] as const,
  trips: ["trips"] as const,
  trip: (id: string) => ["trip", id] as const,
  money: ["money"] as const,
  home: (p?: string) => ["home", p ?? "all"] as const,
  homeRecent: ["home-recent"] as const,
  subscriptions: ["subscriptions"] as const,
  moneyOverview: ["money-overview"] as const,
  family: ["family"] as const,
  emergency: ["emergency"] as const,
  accounts: ["accounts"] as const,
  plan: ["money-plan"] as const,
  calendar: (month: string, p?: string) => ["calendar", month, p ?? "all"] as const,
};

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: api.auth.me });
export const useProfiles = () => useQuery({ queryKey: keys.profiles, queryFn: api.profiles.list });
export const useTimeline = (profileId?: string) =>
  useQuery({ queryKey: keys.timeline(profileId), queryFn: () => api.timeline(profileId) });
export const useItem = (id: string) => useQuery({ queryKey: keys.item(id), queryFn: () => api.items.get(id) });
export const useItems = (q: { profile_id?: string; category?: string; q?: string }) =>
  useQuery({ queryKey: keys.items(q), queryFn: () => api.items.list(q) });
export const useDocuments = (q: { profile_id?: string; item_id?: string }) =>
  useQuery({ queryKey: keys.docs(q), queryFn: () => api.documents.list(q) });
export const useReminders = () => useQuery({ queryKey: keys.reminders, queryFn: api.reminders.inbox });
export const useGuide = (country?: string | null, item?: string) =>
  useQuery({
    queryKey: keys.guide(country ?? "", item ?? ""),
    queryFn: () => api.guides.get(country!, item!),
    enabled: !!country && !!item,
    retry: false, // 404 = no guide yet, don't hammer the server
  });
export const useTrips = () => useQuery({ queryKey: keys.trips, queryFn: api.trips.list });
export const useTripCheck = (id: string) => useQuery({ queryKey: keys.trip(id), queryFn: () => api.trips.check(id) });
export const useMoney = () => useQuery({ queryKey: keys.money, queryFn: api.money });
export const useHome = (profileId?: string) =>
  useQuery({ queryKey: keys.home(profileId), queryFn: () => api.home.list(profileId) });
export const useMoneyOverview = () => useQuery({ queryKey: keys.moneyOverview, queryFn: api.moneyOverview });
export const useFamily = () => useQuery({ queryKey: keys.family, queryFn: api.family });
export const useAccounts = () => useQuery({ queryKey: keys.accounts, queryFn: api.accounts.list });
export const useMoneyPlan = () => useQuery({ queryKey: keys.plan, queryFn: api.moneyPlan });
export const useEmergency = () => useQuery({ queryKey: keys.emergency, queryFn: api.emergency });
export const useSubscriptions = () => useQuery({ queryKey: keys.subscriptions, queryFn: api.subscriptions });
export const useCalendar = (month: string, profileId?: string) =>
  useQuery({ queryKey: keys.calendar(month, profileId), queryFn: () => api.calendar(month, profileId) });
export const useHomeRecent = () => useQuery({ queryKey: keys.homeRecent, queryFn: api.home.recent });

/** After any change to items, refresh everything that shows items. */
function useInvalidateItems() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["item"] });
    qc.invalidateQueries({ queryKey: ["trip"] });
    qc.invalidateQueries({ queryKey: keys.money });
    qc.invalidateQueries({ queryKey: ["home"] });
    qc.invalidateQueries({ queryKey: keys.homeRecent });
    qc.invalidateQueries({ queryKey: keys.subscriptions });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: keys.moneyOverview });
    qc.invalidateQueries({ queryKey: keys.family });
    qc.invalidateQueries({ queryKey: keys.emergency });
    qc.invalidateQueries({ queryKey: keys.plan });
    qc.invalidateQueries({ queryKey: ["docs"] });
  };
}

export function useCreateItem() {
  const done = useInvalidateItems();
  return useMutation({ mutationFn: (b: ItemIn) => api.items.create(b), onSuccess: done });
}

export function useUpdateItem(id: string) {
  const done = useInvalidateItems();
  return useMutation({ mutationFn: (b: ItemPatch) => api.items.update(id, b), onSuccess: done });
}

export function useRenewed(id: string) {
  const done = useInvalidateItems();
  return useMutation({
    mutationFn: (b: { ends_on: string; starts_on?: string; amount_minor?: number; number?: string }) =>
      api.items.renewed(id, b),
    onSuccess: done,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: ProfileIn) => api.profiles.create(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.profiles });
      qc.invalidateQueries({ queryKey: keys.family });
      qc.invalidateQueries({ queryKey: keys.emergency });
    },
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: TripIn) => api.trips.create(b),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  });
}

export function useReminderAction() {
  const qc = useQueryClient();
  const done = useInvalidateItems();
  return useMutation({
    mutationFn: ({ id, action, days }: { id: string; action: "snooze" | "done" | "not_renewing"; days?: number }) =>
      action === "snooze" ? api.reminders.snooze(id, days ?? 3).then(() => undefined)
        : action === "done" ? api.reminders.done(id) : api.reminders.notRenewing(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.reminders });
      done();
    },
  });
}

export function useRefilled(id: string) {
  const done = useInvalidateItems();
  return useMutation({ mutationFn: (cycleDays?: number) => api.items.refilled(id, cycleDays), onSuccess: done });
}

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: UserPatch) => api.auth.updateMe(b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.me });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: keys.subscriptions });
      qc.invalidateQueries({ queryKey: keys.moneyOverview });
      qc.invalidateQueries({ queryKey: keys.plan });
    },
  });
}

export function useAccountMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: keys.accounts });
    qc.invalidateQueries({ queryKey: keys.plan });
  };
  return {
    create: useMutation({ mutationFn: (b: AccountIn) => api.accounts.create(b), onSuccess: done }),
    update: useMutation({ mutationFn: ({ id, ...b }: Partial<AccountIn> & { id: string }) => api.accounts.update(id, b), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => api.accounts.remove(id), onSuccess: done }),
  };
}

export function useDocumentMutations() {
  const qc = useQueryClient();
  const done = () => {
    qc.invalidateQueries({ queryKey: ["docs"] });
    qc.invalidateQueries({ queryKey: keys.emergency });
  };
  return {
    update: useMutation({
      mutationFn: ({ id, ...b }: { id: string; title?: string; folder?: import("@upkept/api-client").Folder; keep_offline?: boolean }) =>
        api.documents.update(id, b),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.documents.remove(id), onSuccess: done }),
  };
}
