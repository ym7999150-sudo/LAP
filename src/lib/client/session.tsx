"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AchievementDef } from "@/lib/gamification/config";
import { api } from "./api";

export interface Profile {
  id: string;
  displayName: string;
  tag: string;
  locale: "ar" | "en";
  role: string;
  isPublic: boolean;
  stats: { totalXp: number; physicsXp: number; chemistryXp: number; experimentsCompleted: number; circuitsBuilt: number; projectsSaved: number } | null;
  level: { level: number; title: { en: string; ar: string }; next: { level: number; xpRequired: number; title: { en: string; ar: string } } | null; progress: number; xp: number };
  achievements: { id: string; unlockedAt: string }[];
}

export interface RewardToast {
  id: number;
  xp: number;
  unlocked: AchievementDef[];
  levelUp?: number;
}

interface SessionCtx {
  user: Profile | null;
  loading: boolean;
  dbAvailable: boolean;
  refresh: () => Promise<void>;
  setUser: (u: Profile | null) => void;
  toasts: RewardToast[];
  pushReward: (r: { xpGained: number; unlocked: AchievementDef[]; levelBefore: number; levelAfter: number }) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbAvailable, setDb] = useState(true);
  const [toasts, setToasts] = useState<RewardToast[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: Profile | null; error?: string }>("/api/session");
      setUser(r.user);
      setDb(!r.error);
    } catch {
      setDb(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pushReward = useCallback(
    (r: { xpGained: number; unlocked: AchievementDef[]; levelBefore: number; levelAfter: number }) => {
      if (r.xpGained <= 0 && r.unlocked.length === 0) return;
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, xp: r.xpGained, unlocked: r.unlocked, levelUp: r.levelAfter > r.levelBefore ? r.levelAfter : undefined }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
      void refresh();
    },
    [refresh],
  );

  return (
    <Ctx.Provider value={{ user, loading, dbAvailable, refresh, setUser, toasts, pushReward, dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)) }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside provider");
  return v;
}
