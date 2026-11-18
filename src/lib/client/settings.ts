"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Quality = "low" | "medium" | "high";

interface Settings {
  quality: Quality;
  sound: boolean;
  reducedMotion: boolean;
  set: (p: Partial<Omit<Settings, "set">>) => void;
}

/** Per-viewer conveniences stored in localStorage (safe if storage is unavailable). */
export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      quality: "medium",
      sound: true,
      reducedMotion: false,
      set: (p) => set(p),
    }),
    {
      name: "labverse-settings",
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
    },
  ),
);

export function prefersReducedMotion() {
  try {
    return useSettings.getState().reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
