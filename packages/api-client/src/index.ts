/**
 * One API client for the website and the mobile app.
 * Handles the login token and refreshes it once when it expires.
 */
import type {
  DocumentMeta, Guide, Item, ItemIn, ItemPatch, MoneySummary, Profile, ProfileIn, RegisterIn, Reminder,
  ScanResult, Timeline, Tokens, Trip, TripCheck, TripIn, User,
} from "./types";

export * from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface TokenStore {
  get(): Promise<Tokens | null>;
  set(tokens: Tokens | null): Promise<void>;
}

export interface ApiOptions {
  baseUrl: string;
  tokens: TokenStore;
  onSignedOut?: () => void;
}

/** A file to upload. On React Native, pass { uri, name, type }; on the web, a Blob. */
export type UploadFile = Blob | { uri: string; name: string; type: string };

export function createApi({ baseUrl, tokens, onSignedOut }: ApiOptions) {
  let refreshing: Promise<boolean> | null = null;

  async function refresh(): Promise<boolean> {
    const current = await tokens.get();
    if (!current) return false;
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    });
    if (!res.ok) {
      await tokens.set(null);
      onSignedOut?.();
      return false;
    }
    await tokens.set((await res.json()) as Tokens);
    return true;
  }

  async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const t = await tokens.get();
    const headers: Record<string, string> = {};
    if (t) headers.Authorization = `Bearer ${t.access_token}`;
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });

    if (res.status === 401 && retry && t) {
      refreshing ??= refresh().finally(() => (refreshing = null));
      if (await refreshing) return request<T>(method, path, body, false);
    }
    if (!res.ok) {
      let message = `Something went wrong (${res.status})`;
      try {
        const data = await res.json();
        if (typeof data.detail === "string") message = data.detail;
      } catch {
        /* not JSON */
      }
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const get = <T>(p: string) => request<T>("GET", p);
  const post = <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {});
  const patch = <T>(p: string, b: unknown) => request<T>("PATCH", p, b);
  const del = (p: string) => request<void>("DELETE", p);
  const qs = (params: Record<string, string | undefined>) => {
    const s = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
    return s ? `?${s}` : "";
  };

  return {
    baseUrl,
    auth: {
      async register(body: RegisterIn) {
        await tokens.set(await post<Tokens>("/auth/register", body));
      },
      async login(email: string, password: string) {
        await tokens.set(await post<Tokens>("/auth/login", { email, password }));
      },
      async logout() {
        await tokens.set(null);
      },
      me: () => get<User>("/auth/me"),
      deleteAccount: async () => {
        await del("/auth/me");
        await tokens.set(null);
      },
    },
    profiles: {
      list: () => get<Profile[]>("/profiles"),
      create: (b: ProfileIn) => post<Profile>("/profiles", b),
      remove: (id: string) => del(`/profiles/${id}`),
    },
    timeline: (profileId?: string) => get<Timeline>(`/timeline${qs({ profile_id: profileId })}`),
    items: {
      list: (p: { profile_id?: string; category?: string; q?: string } = {}) => get<Item[]>(`/items${qs(p)}`),
      get: (id: string) => get<Item>(`/items/${id}`),
      create: (b: ItemIn) => post<Item>("/items", b),
      update: (id: string, b: ItemPatch) => patch<Item>(`/items/${id}`, b),
      renewed: (id: string, b: { ends_on: string; starts_on?: string; amount_minor?: number; number?: string }) =>
        post<Item>(`/items/${id}/renewed`, b),
      revealNumber: (id: string) => get<{ number: string | null }>(`/items/${id}/number`),
      remove: (id: string) => del(`/items/${id}`),
    },
    documents: {
      list: (p: { profile_id?: string; item_id?: string } = {}) => get<DocumentMeta[]>(`/documents${qs(p)}`),
      upload(f: { file: UploadFile; profile_id: string; item_id?: string; title?: string; keep_offline?: boolean }) {
        const form = new FormData();
        form.append("file", f.file as Blob);
        form.append("profile_id", f.profile_id);
        if (f.item_id) form.append("item_id", f.item_id);
        form.append("title", f.title ?? "Document");
        form.append("keep_offline", String(!!f.keep_offline));
        return request<DocumentMeta>("POST", "/documents", form);
      },
      fileUrl: (id: string) => `${baseUrl}/documents/${id}/file`,
      remove: (id: string) => del(`/documents/${id}`),
    },
    scan: (text: string, monthFirst = false) => post<ScanResult>("/scan", { text, month_first: monthFirst }),
    reminders: {
      inbox: () => get<Reminder[]>("/reminders"),
      snooze: (id: string, days: number) => post<Reminder>(`/reminders/${id}/snooze`, { days }),
      done: (id: string) => post<void>(`/reminders/${id}/done`),
      notRenewing: (id: string) => post<void>(`/reminders/${id}/not-renewing`),
      registerDevice: (expo_push_token: string, platform: "android" | "ios") =>
        post<void>("/devices", { expo_push_token, platform }),
      sendTest: () => post<void>("/reminders/test"),
    },
    guides: {
      list: (country?: string) => get<Guide[]>(`/guides${qs({ country })}`),
      get: (country: string, item: string) => get<Guide>(`/guides/${country}/${item}`),
    },
    trips: {
      list: () => get<Trip[]>("/trips"),
      create: (b: TripIn) => post<Trip>("/trips", b),
      check: (id: string) => get<TripCheck>(`/trips/${id}/check`),
      remove: (id: string) => del(`/trips/${id}`),
    },
    money: () => get<MoneySummary>("/money/summary"),
  };
}

export type Api = ReturnType<typeof createApi>;
