"use client";
import { ArrowUpRight, Award, CalendarCheck, Dna, FlaskConical, FolderOpen, Search, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LevelBadge } from "@/components/shell/LevelBadge";
import { Card, Empty, Skeleton } from "@/components/ui/Page";
import { EXPERIMENTS } from "@/lib/curriculum/experiments";
import { experimentHref } from "@/lib/curriculum/links";
import { ACHIEVEMENTS } from "@/lib/gamification/config";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";

interface ProjectRow {
  id: string;
  title: string;
  lab: string;
  updatedAt: string;
}
interface Board {
  rows: { userId: string; displayName: string; tag: string; xp: number; rank: number }[];
}

export default function Dashboard() {
  const { t, L, locale } = useI18n();
  const { user } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const projects = useApi<{ projects: ProjectRow[] }>(user ? "/api/projects" : null);
  const board = useApi<Board>("/api/leaderboard?size=5");
  const day = Math.floor(Date.now() / 864e5);
  const daily = EXPERIMENTS[day % EXPERIMENTS.length]!;
  const recommended = EXPERIMENTS.filter((e) => e.difficulty === 1).slice(0, 4);
  const recentAch = (user?.achievements ?? []).slice(-3).reverse().map((a) => ACHIEVEMENTS.find((d) => d.id === a.id)).filter(Boolean);
  const last = projects.data?.projects[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <section className="animate-in relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface-2 to-surface p-6 sm:p-8">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_280px] md:items-center">
          <div>
            <p className="text-sm text-accent">{t("hello")}{user ? `، ${user.displayName}` : ""} 👋</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{t("tagline")}</h1>
            <form
              className="relative mt-5 max-w-lg"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
              <input className="input h-11 ps-10" placeholder={t("search_placeholder")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search")} />
            </form>
          </div>
          {user ? (
            <div className="rounded-2xl border border-line bg-bg/50 p-4">
              <LevelBadge />
            </div>
          ) : (
            <Link href="/" className="btn btn-primary h-11">
              {t("welcome_enter")}
            </Link>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: "/lab/physics", icon: Zap, title: t("nav_physics"), text: t("physics_card"), color: "text-accent", glow: "from-accent/20" },
          { href: "/lab/chemistry", icon: FlaskConical, title: t("nav_chemistry"), text: t("chemistry_card"), color: "text-chem", glow: "from-chem/20" },
          { href: "/biology", icon: Dna, title: t("nav_biology"), text: L({ en: "Cells, heredity, DNA and evolution — interactive simulations.", ar: "الخلايا والوراثة والـDNA والتطور — محاكاة تفاعلية." }), color: "text-ok", glow: "from-ok/20" },
        ].map((c, i) => (
          <div key={c.href} className="animate-in" style={{ animationDelay: `${0.08 * (i + 1)}s` }}>
            <Link href={c.href} className="group relative block overflow-hidden rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-line-strong">
              <div className={`pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-gradient-to-br ${c.glow} to-transparent blur-2xl`} />
              <c.icon className={c.color} size={28} />
              <h2 className="mt-4 text-lg font-semibold">{c.title}</h2>
              <p className="mt-1.5 text-sm text-muted">{c.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-ink">
                {t("open")} <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 rtl:-scale-x-100" />
              </span>
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <FolderOpen size={17} className="text-accent" /> {t("recent_projects")}
            </h2>
            <Link href="/projects" className="text-xs text-accent">
              {t("nav_projects")}
            </Link>
          </div>
          {!user ? (
            <Empty text={t("sign_in_to_save")} />
          ) : projects.loading ? (
            <Skeleton rows={3} h="h-12" />
          ) : projects.data?.projects.length ? (
            <ul className="divide-y divide-line">
              {projects.data.projects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link href={`/lab/${p.lab}?project=${p.id}`} className="flex items-center gap-3 py-2.5 hover:text-accent">
                    {p.lab === "physics" ? <Zap size={16} className="text-accent" /> : <FlaskConical size={16} className="text-chem" />}
                    <span className="flex-1 truncate text-sm">{p.title}</span>
                    <span className="text-xs text-faint">{new Date(p.updatedAt).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={t("empty_list")} />
          )}
          {last && (
            <Link href={`/lab/${last.lab}?project=${last.id}`} className="btn btn-primary mt-3">
              {t("continue_experiment")}
            </Link>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <CalendarCheck size={17} className="text-warn" /> {t("daily_challenge")}
          </h2>
          <p className="font-medium">{L(daily.title)}</p>
          <p className="mt-1 text-sm text-muted">{L(daily.objective)}</p>
          <Link href={experimentHref(daily)} className="btn mt-4 w-full">
            {t("start")} · <span className="ltr-num">+{daily.xp} XP</span>
          </Link>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">{t("recommended")}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {recommended.map((e) => (
              <Link key={e.id} href={experimentHref(e)} className="rounded-xl border border-line p-3 hover:border-line-strong hover:bg-surface-2">
                <div className="text-sm font-medium">{L(e.title)}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted">{L(e.objective)}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Trophy size={17} className="text-warn" /> {t("leaderboard_preview")}
            </h2>
            <Link href="/leaderboard" className="text-xs text-accent">
              {t("nav_leaderboard")}
            </Link>
          </div>
          {board.loading ? (
            <Skeleton rows={4} h="h-8" />
          ) : board.data?.rows.length ? (
            <ol className="space-y-1.5">
              {board.data.rows.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-center font-bold text-faint ltr-num">{r.rank}</span>
                  <span className="flex-1 truncate">
                    {r.displayName} <span className="text-faint ltr-num">#{r.tag}</span>
                  </span>
                  <span className="mono text-xs text-accent ltr-num">{r.xp}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty text={t("empty_list")} />
          )}
        </Card>

        {recentAch.length > 0 && (
          <Card className="lg:col-span-3">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Award size={17} className="text-ok" /> {t("recent_achievements")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {recentAch.map((a) => (
                <span key={a!.id} className="chip border-ok/40 py-1 text-ok">
                  {L(a!.title)}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
