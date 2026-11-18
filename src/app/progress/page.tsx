"use client";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { REACTIONS } from "@/lib/chem/reactions";
import { EXPERIMENTS, UNITS } from "@/lib/curriculum/experiments";
import { experimentHref } from "@/lib/curriculum/links";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

export default function Progress() {
  const { t, L } = useI18n();
  const { user } = useSession();
  const { data, loading } = useApi<{ completed: string[]; reactions: string[] }>(user ? "/api/progress" : null);
  if (!user) return <Page title={t("nav_progress")}><Empty text={t("sign_in_to_save")} /></Page>;
  const done = new Set(data?.completed ?? []);
  return (
    <Page title={t("nav_progress")}>
      {loading && !data ? (
        <Skeleton rows={4} />
      ) : (
        <div className="space-y-4">
          {UNITS.map((u) => {
            const items = EXPERIMENTS.filter((e) => e.unit === u.id);
            const n = items.filter((e) => done.has(e.id)).length;
            return (
              <section key={u.id} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold"><span className="me-2 text-accent ltr-num">{u.number}.</span>{L(u.title)}</h2>
                  <span className="mono text-sm text-muted ltr-num">{n}/{items.length}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full bg-gradient-to-r from-accent to-electric" style={{ width: `${items.length ? (n / items.length) * 100 : 0}%` }} />
                </div>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {items.map((e) => (
                    <li key={e.id}>
                      <Link href={experimentHref(e)} className="flex items-center gap-2 text-sm hover:text-accent">
                        {done.has(e.id) ? <CheckCircle2 size={15} className="text-ok" /> : <Circle size={15} className="text-faint" />}
                        {L(e.title)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          <section className="panel p-5">
            <h2 className="font-semibold">{L({ en: "Reactions discovered", ar: "التفاعلات المكتشفة" })} <span className="mono text-sm text-muted ltr-num">{data?.reactions.length ?? 0}/{REACTIONS.length}</span></h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {REACTIONS.map((r) => (
                <span key={r.id} className={`chip ${data?.reactions.includes(r.id) ? "border-ok/50 text-ok" : "opacity-50"}`}>{r.id}</span>
              ))}
            </div>
          </section>
        </div>
      )}
    </Page>
  );
}
