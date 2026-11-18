"use client";
import Link from "next/link";
import { useState } from "react";
import { LevelBadge } from "@/components/shell/LevelBadge";
import { Empty, Page } from "@/components/ui/Page";
import { api, ApiError } from "@/lib/client/api";
import { useSession, type Profile } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";

export default function ProfilePage() {
  const { t, L } = useI18n();
  const { user, setUser } = useSession();
  const [name, setName] = useState(user?.displayName ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  if (!user)
    return (
      <Page title={t("nav_profile")}>
        <Empty text={t("sign_in_to_save")} />
        <Link href="/" className="btn btn-primary mt-4">{t("welcome_enter")}</Link>
      </Page>
    );
  const s = user.stats;
  const save = async (body: Record<string, unknown>) => {
    try {
      const r = await api<{ user: Profile }>("/api/session", { method: "PATCH", body });
      setUser(r.user);
      setMsg(t("saved"));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.code : t("error_generic"));
    }
  };
  return (
    <Page title={t("nav_profile")}>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel p-5">
          <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full bg-gradient-to-br from-accent to-electric text-3xl font-bold text-black">{user.displayName.slice(0, 1)}</div>
          <LevelBadge />
          <p className="mt-3 text-center text-xs text-faint ltr-num">#{user.tag}</p>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              [t("xp"), s?.totalXp ?? 0],
              [t("board_physics"), s?.physicsXp ?? 0],
              [t("board_chemistry"), s?.chemistryXp ?? 0],
              [t("nav_experiments"), s?.experimentsCompleted ?? 0],
              [t("board_circuit"), s?.circuitsBuilt ?? 0],
              [t("nav_achievements"), user.achievements.length],
            ].map(([k, v]) => (
              <div key={String(k)} className="panel p-4">
                <div className="text-xs text-faint">{k}</div>
                <div className="mono mt-1 text-2xl font-bold text-accent ltr-num">{v}</div>
              </div>
            ))}
          </div>
          <form className="panel space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); void save({ displayName: name }); }}>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">{t("display_name")}</span>
              <input className="input" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={user.isPublic} onChange={(e) => void save({ isPublic: e.target.checked })} />
              {t("public_profile")}
            </label>
            <button className="btn btn-primary">{t("save")}</button>
            {msg && <p className="text-sm text-muted">{msg}</p>}
            <p className="text-xs text-faint">{L({ en: "Guest accounts are tied to this browser's cookie. Account linking (email/OAuth) can be added later without losing progress.", ar: "حسابات الضيوف مرتبطة بملف تعريف الارتباط في هذا المتصفح. يمكن لاحقاً ربط حساب (بريد/OAuth) دون فقدان التقدم." })}</p>
          </form>
        </div>
      </div>
    </Page>
  );
}
