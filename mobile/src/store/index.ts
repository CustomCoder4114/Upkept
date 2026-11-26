/**
 * Small app state that is NOT server data (server data lives in TanStack Query).
 */
import type { ScanResult } from "@upkept/api-client";
import { create } from "zustand";

interface AppState {
  /** Timeline filter: "all" or a profile id (Everyone / Me / Zawadi / Mum) */
  profileFilter: string;
  setProfileFilter: (id: string) => void;

  /** App lock: true until the user unlocks with face/fingerprint/PIN */
  locked: boolean;
  setLocked: (locked: boolean) => void;

  /** Hand-off from the camera screen to the "Is this right?" screen */
  pendingScan: { photoUri: string; photoBase64?: string; photoType?: string; result: ScanResult; renewItemId?: string } | null;
  setPendingScan: (s: AppState["pendingScan"]) => void;

  /** Hand-off from the Home list camera (barcode / date) back to Quick add */
  homeDraft: { name?: string; date?: string; message?: string };
  setHomeDraft: (d: AppState["homeDraft"]) => void;
}

export const useApp = create<AppState>((set) => ({
  profileFilter: "all",
  setProfileFilter: (profileFilter) => set({ profileFilter }),
  locked: true,
  setLocked: (locked) => set({ locked }),
  pendingScan: null,
  setPendingScan: (pendingScan) => set({ pendingScan }),
  homeDraft: {},
  setHomeDraft: (homeDraft) => set({ homeDraft }),
}));
