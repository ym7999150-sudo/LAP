"use client";
import { Award, Lock } from "lucide-react";
import { Page } from "@/components/ui/Page";
import { ACHIEVEMENTS, LEVELS } from "@/lib/gamification/config";
import { useSession } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";

export default function Achievements() {
  const { t, L, locale } = useI18n();
  const { user } = useSession();
  const got = new Map((user?.achievements ?? []).map((a) => [a.id, a.unlockedAt]));
  const lv = user?.level.level ?? 1;
  return (
    <Page title={t("nav_achievements")} subtitle={L({ en: "Achievements are awarded only after the server re-checks your experiment.", ar: "تُمنح الإنجازات فقط بعد أن يتحقق الخادم من تجربتك." })}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((a) => {
          const at = got.get(a.id);
          return (
            <div key={a.id} className={`panel flex gap-3 p-4 ${at ? "border-ok/40" : "opacity-70"}`}>
              <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${at ? "bg-ok/15 text-ok" : "bg-surface-3 text-faint"}`}>{at ? <Award size={20} /> : <Lock size={18} />}</div>
              <div className="min-w-0">
                <div className="font-semibold">{L(a.title)}</div>
                <p className="mt-0.5 text-xs text-muted">{L(a.description)}</p>
                <p className="mt-1.5 text-[11px] text-faint ltr-num">
                  +{a.xp} XP{at ? ` · ${new Date(at).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <h2 className="mb-3 mt-10 text-lg font-semibold">{t("level")}</h2>
      <div className="panel scroll-thin max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {LEVELS.map((l) => (
              <tr key={l.level} className={`border-b border-line/60 ${l.level === lv ? "bg-accent/10 text-accent" : l.level < lv ? "text-muted" : ""}`}>
                <td className="w-14 px-4 py-2 font-bold ltr-num">{l.level}</td>
                <td className="py-2">{L(l.title)}</td>
                <td className="mono px-4 py-2 text-end ltr-num">{l.xpRequired} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
