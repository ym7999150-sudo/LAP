"use client";
import { CheckCircle2, Dna, FlaskConical, Mountain, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Page } from "@/components/ui/Page";
import { CURRICULUM_PROGRAMS, EXPERIMENTS, UNITS } from "@/lib/curriculum/experiments";
import { experimentHref } from "@/lib/curriculum/links";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

const ICON = { physics: Zap, chemistry: FlaskConical, biology: Dna, earth: Mountain } as const;

export default function Experiments() {
  const { t, L } = useI18n();
  const { user } = useSession();
  const [filter, setFilter] = useState<string>("all");
  const progress = useApi<{ completed: string[] }>(user ? "/api/progress" : null);
  const done = new Set(progress.data?.completed ?? []);
  const groups = [...UNITS.map((u) => ({ id: u.id, title: L(u.title), number: u.number, items: EXPERIMENTS.filter((e) => e.unit === u.id) })), { id: "extra", title: t("experiments_all"), number: 0, items: EXPERIMENTS.filter((e) => !e.unit) }];
  return (
    <Page title={t("nav_experiments")} subtitle={L(CURRICULUM_PROGRAMS[0]!.title)}>
      <p className="mb-4 rounded-xl border border-warn/30 bg-warn/5 p-3 text-xs text-warn">{t("curriculum_unverified")}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {["all", "physics", "chemistry", "biology", "earth"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip px-3 py-1.5 text-xs ${filter === f ? "border-accent text-accent" : ""}`}>
            {f === "all" ? t("experiments_all") : f === "physics" ? t("board_physics") : f === "chemistry" ? t("board_chemistry") : f === "biology" ? "🧬" : "🪨"}
          </button>
        ))}
      </div>
      <div className="space-y-8">
        {groups.map((g) => {
          const items = g.items.filter((e) => filter === "all" || e.lab === filter);
          if (!items.length) return null;
          return (
            <section key={g.id}>
              <h2 className="mb-3 text-lg font-semibold">
                {g.number ? <span className="me-2 text-accent ltr-num">{g.number}.</span> : null}
                {g.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => {
                  const Icon = ICON[e.lab];
                  return (
                    <Link key={e.id} href={experimentHref(e)} className="panel group flex flex-col p-4 transition-colors hover:border-line-strong">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className={e.lab === "physics" ? "text-accent" : e.lab === "chemistry" ? "text-chem" : "text-ok"} />
                        <span className="text-xs text-faint">{"★".repeat(e.difficulty)}</span>
                        <span className="flex-1" />
                        {done.has(e.id) && <CheckCircle2 size={16} className="text-ok" aria-label={t("completed")} />}
                        <span className="chip ltr-num">+{e.xp} XP</span>
                      </div>
                      <h3 className="mt-3 font-semibold">{L(e.title)}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{L(e.objective)}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </Page>
  );
}
