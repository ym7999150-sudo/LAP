"use client";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useSettings, type Quality } from "@/lib/client/settings";
import { sfx } from "@/lib/client/sound";
import { useI18n } from "@/lib/i18n/client";

export default function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { user, setUser } = useSession();
  const s = useSettings();
  const router = useRouter();
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-line/60 py-3 last:border-0">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
  return (
    <Page title={t("nav_settings")}>
      <div className="panel max-w-2xl px-5">
        <Row label={t("language")}>
          <div className="flex gap-1 rounded-lg border border-line p-1">
            {(["ar", "en"] as const).map((l) => (
              <button key={l} onClick={() => { setLocale(l); if (user) void api("/api/session", { method: "PATCH", body: { locale: l } }); }} className={`rounded-md px-3 py-1 text-sm ${locale === l ? "bg-accent/15 text-accent" : "text-muted"}`}>
                {l === "ar" ? "العربية" : "English"}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("quality")}>
          <div className="flex gap-1 rounded-lg border border-line p-1">
            {(["low", "medium", "high"] as Quality[]).map((q) => (
              <button key={q} onClick={() => s.set({ quality: q })} className={`rounded-md px-3 py-1 text-sm ${s.quality === q ? "bg-accent/15 text-accent" : "text-muted"}`}>
                {t(q === "low" ? "quality_low" : q === "medium" ? "quality_medium" : "quality_high")}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("sound")}>
          <input type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={s.sound} onChange={(e) => { s.set({ sound: e.target.checked }); if (e.target.checked) setTimeout(() => sfx.snap(), 50); }} />
        </Row>
        <Row label={t("reduced_motion")}>
          <input type="checkbox" className="size-5 accent-[var(--color-accent)]" checked={s.reducedMotion} onChange={(e) => s.set({ reducedMotion: e.target.checked })} />
        </Row>
        {user && (
          <Row label={t("sign_out")}>
            <button className="btn btn-danger" onClick={async () => { await api("/api/session", { method: "DELETE" }); setUser(null); router.push("/"); }}>
              {t("sign_out")}
            </button>
          </Row>
        )}
      </div>
    </Page>
  );
}
