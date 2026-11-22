/** Server data through TanStack Query: caching, refetching and loading states in one place. */
import type { ItemIn, ItemPatch, ProfileIn, TripIn } from "@upkept/api-client";
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

/** After any change to items, refresh everything that shows items. */
function useInvalidateItems() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["timeline"] });
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["item"] });
    qc.invalidateQueries({ queryKey: ["trip"] });
    qc.invalidateQueries({ queryKey: keys.money });
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
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.profiles }),
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
