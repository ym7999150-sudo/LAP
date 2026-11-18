"use client";
import { ArrowUpRight, CheckCircle2, Dna, Microscope, Shuffle, Droplet, Grid2x2 } from "lucide-react";
import Link from "next/link";
import { Page } from "@/components/ui/Page";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

const ICONS: Record<string, typeof Dna> = { "cell-structure": Microscope, "punnett-monohybrid": Grid2x2, "natural-selection": Shuffle, "blood-groups": Droplet, "dna-pairing": Dna };

export default function Biology() {
  const { t, L } = useI18n();
  const { user } = useSession();
  const progress = useApi<{ completed: string[] }>(user ? "/api/progress" : null);
  const done = new Set(progress.data?.completed ?? []);
  const items = EXPERIMENTS.filter((e) => e.lab === "biology");
  return (
    <Page title={t("nav_biology")} subtitle={L({ en: "Cells, heredity, DNA and evolution — interactive models you can explore and test.", ar: "الخلايا والوراثة والـDNA والتطور — نماذج تفاعلية تستكشفها وتختبر نفسك فيها." })}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e, i) => {
          const Icon = ICONS[e.id] ?? Dna;
          return (
            <Link key={e.id} href={`/experiments/${e.id}`} className="panel group relative overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-ok/50 animate-in" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="pointer-events-none absolute -end-8 -top-8 size-32 rounded-full bg-ok/10 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-ok/15 text-ok">
                  <Icon size={22} />
                </span>
                {done.has(e.id) ? <CheckCircle2 className="text-ok" size={18} /> : <span className="chip ltr-num">+{e.xp} XP</span>}
              </div>
              <h2 className="mt-4 font-semibold">{L(e.title)}</h2>
              <p className="mt-1 text-sm text-muted">{L(e.objective)}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ok">
                {t("start")} <ArrowUpRight size={15} className="rtl:-scale-x-100" />
              </span>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
