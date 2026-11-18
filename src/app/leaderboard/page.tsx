"use client";
import { Crown, Medal } from "lucide-react";
import { useState } from "react";
import { Empty, Page, Skeleton } from "@/components/ui/Page";
import { useSession } from "@/lib/client/session";
import { useApi } from "@/lib/client/useApi";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dict";

const BOARDS = ["global", "physics", "chemistry", "circuit", "experiment"] as const;
const PERIODS = ["all", "week", "month"] as const;

interface Res {
  rows: { userId: string; displayName: string; tag: string; xp: number; rank: number }[];
  total: number;
  page: number;
  pageSize: number;
  me: { rank: number; xp: number } | null;
}

export default function Leaderboard() {
  const { t } = useI18n();
  const { user } = useSession();
  const [board, setBoard] = useState<(typeof BOARDS)[number]>("global");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("all");
  const [page, setPage] = useState(0);
  const { data, loading } = useApi<Res>(`/api/leaderboard?board=${board}&period=${period}&page=${page}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <Page title={t("nav_leaderboard")}>
      <div className="mb-4 flex flex-wrap gap-2">
        {BOARDS.map((b) => (
          <button key={b} onClick={() => { setBoard(b); setPage(0); }} className={`chip px-3 py-1.5 text-xs ${board === b ? "border-accent text-accent" : ""}`}>
            {t(`board_${b}` as DictKey)}
          </button>
        ))}
        <span className="mx-1 w-px bg-line" />
        {PERIODS.map((p) => (
          <button key={p} onClick={() => { setPeriod(p); setPage(0); }} className={`chip px-3 py-1.5 text-xs ${period === p ? "border-electric text-electric" : ""}`}>
            {t(`period_${p}` as DictKey)}
          </button>
        ))}
      </div>
      {data?.me && (
        <div className="panel mb-4 flex items-center gap-3 border-accent/40 p-3 text-sm">
          <span className="text-muted">{t("your_rank")}</span>
          <span className="text-lg font-bold text-accent ltr-num">#{data.me.rank}</span>
          <span className="mono ms-auto ltr-num">{data.me.xp} XP</span>
        </div>
      )}
      {loading && !data ? (
        <Skeleton rows={8} h="h-12" />
      ) : !data?.rows.length ? (
        <Empty text={t("empty_list")} />
      ) : (
        <ol className="panel divide-y divide-line overflow-hidden">
          {data.rows.map((r) => (
            <li key={r.userId} className={`flex items-center gap-3 px-4 py-3 ${r.userId === user?.id ? "bg-accent/5" : ""}`}>
              <span className="w-8 text-center font-bold ltr-num">
                {r.rank === 1 ? <Crown size={18} className="mx-auto text-warn" /> : r.rank <= 3 ? <Medal size={18} className={`mx-auto ${r.rank === 2 ? "text-slate-300" : "text-amber-700"}`} /> : r.rank}
              </span>
              <span className="grid size-9 place-items-center rounded-full bg-surface-3 text-sm font-semibold">{r.displayName.slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.displayName} <span className="text-xs text-faint ltr-num">#{r.tag}</span>
              </span>
              <span className="mono text-accent ltr-num">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("prev")}</button>
          <span className="text-sm text-muted ltr-num">{page + 1} / {pages}</span>
          <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>{t("next")}</button>
        </div>
      )}
    </Page>
  );
}
