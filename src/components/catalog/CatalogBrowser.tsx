"use client";
import { ChevronLeft, ChevronRight, ExternalLink, Flag, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { SupportBadge } from "@/components/lab/panels/SupportBadge";
import { Empty, Skeleton } from "@/components/ui/Page";
import { prettyFormula } from "@/lib/chem/formula";
import { getSubstance, pubchemSearchUrl } from "@/lib/chem/substances";
import { api } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { useI18n } from "@/lib/i18n/client";
import { CATEGORY_LABELS, type SimulationSupport } from "@/lib/registry";

type Kind = "components" | "substances" | "reactions";
type L2 = { en: string; ar: string };
interface Item {
  id: string;
  name?: L2;
  description?: L2;
  category?: string;
  support?: SimulationSupport;
  notes?: L2 | null;
  formula?: string | null;
  cls?: string;
  state?: string;
  color?: string;
  hazards?: string[];
  virtualOnly?: boolean;
  equation?: string;
  explanation?: L2;
  safety?: string;
  safetyNote?: L2 | null;
  types?: string[];
  provenance?: string;
  source?: string;
}

const SUB_CATS = ["acid", "base", "salt", "metal", "nonmetal", "oxide", "gas", "indicator", "organic", "catalyst", "solvent"];
const RX_CATS = ["neutralization", "precipitation", "single-displacement", "double-displacement", "decomposition", "combination", "combustion", "redox", "acid-carbonate", "acid-metal"];

export function CatalogBrowser({ kind, lab, categories, initialQ = "" }: { kind: Kind; lab?: "physics" | "chemistry"; categories?: string[]; initialQ?: string }) {
  const { t, L } = useI18n();
  const { user } = useSession();
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: Item[]; total: number; size: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState<string | null>(null);
  const cats = categories ?? (kind === "substances" ? SUB_CATS : kind === "reactions" ? RX_CATS : []);

  useEffect(() => {
    const ctrl = new AbortController();
    const h = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams({ kind, page: String(page), size: "24" });
      if (q.trim()) params.set("q", q.trim());
      if (cat) params.set("category", cat);
      if (lab) params.set("lab", lab);
      try {
        setData(await api(`/api/catalog?${params}`, { signal: ctrl.signal }));
      } catch {}
      setLoading(false);
    }, 200);
    return () => {
      clearTimeout(h);
      ctrl.abort();
    };
  }, [kind, q, cat, page, lab]);

  const report = async (id: string) => {
    const reason = prompt(t("report_issue"));
    if (!reason) return;
    try {
      await api("/api/reports", { body: { targetType: kind === "components" ? "component" : kind === "substances" ? "substance" : "reaction", targetId: id, reason } });
      setReported(id);
    } catch {}
  };

  const pages = data ? Math.ceil(data.total / data.size) : 0;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input ps-9" placeholder={t("search")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} aria-label={t("search")} />
        </div>
        {cats.length > 0 && (
          <select className="input w-auto" value={cat} onChange={(e) => { setCat(e.target.value); setPage(0); }}>
            <option value="">—</option>
            {cats.map((c) => (
              <option key={c} value={c}>{L(CATEGORY_LABELS[c]) || c}</option>
            ))}
          </select>
        )}
      </div>
      {loading && !data ? (
        <Skeleton rows={6} />
      ) : !data?.items.length ? (
        <Empty text={t("empty_list")} />
      ) : (
        <ul className={`grid gap-3 ${kind === "reactions" ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"} ${loading ? "opacity-60" : ""}`}>
          {data.items.map((it) => (
            <li key={it.id} className="panel flex flex-col p-4">
              {kind === "components" && (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{L(it.name)}</h3>
                    <SupportBadge support={it.support!} />
                  </div>
                  <p className="mt-1 text-xs text-faint">{L(CATEGORY_LABELS[it.category!]) || it.category}</p>
                  <p className="mt-2 flex-1 text-sm text-muted">{L(it.description)}</p>
                  {it.notes && <p className="mt-2 text-[11px] text-faint">{L(it.notes)}</p>}
                </>
              )}
              {kind === "substances" && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="size-8 shrink-0 rounded-full border border-line-strong" style={{ background: it.color }} />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{L(it.name)}</h3>
                      <p className="mono text-sm text-accent ltr-num">{it.formula ? prettyFormula(it.formula) : "—"}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip">{it.cls}</span>
                    <span className="chip">{it.state}</span>
                    {it.hazards?.filter((h) => h !== "none").map((h) => <span key={h} className="chip border-warn/40 text-warn">{h}</span>)}
                    {it.virtualOnly && <span className="chip border-danger/50 text-danger">{t("virtual_only").split("—")[0]}</span>}
                  </div>
                  {getSubstance(it.id) && (
                    <a className="mt-3 inline-flex items-center gap-1 text-xs text-accent" href={pubchemSearchUrl(getSubstance(it.id)!)} target="_blank" rel="noopener noreferrer">
                      PubChem <ExternalLink size={12} />
                    </a>
                  )}
                </>
              )}
              {kind === "reactions" && (
                <>
                  <p className="mono rounded-lg bg-bg/60 p-2 text-sm text-accent ltr-num" dir="ltr">{it.equation}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {it.types?.map((x) => <span key={x} className="chip">{x}</span>)}
                    <span className={`chip ${it.safety === "virtual-only" ? "border-danger/50 text-danger" : it.safety === "supervised" ? "border-warn/40 text-warn" : "border-ok/40 text-ok"}`}>{it.safety}</span>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-muted">{L(it.explanation)}</p>
                  {it.safetyNote && <p className="mt-2 text-xs text-warn">{L(it.safetyNote)}</p>}
                  <p className="mt-2 text-[10px] text-faint">{it.provenance}</p>
                </>
              )}
              {user && (
                <button className="mt-3 inline-flex items-center gap-1 self-start text-[11px] text-faint hover:text-warn" onClick={() => report(it.id)} disabled={reported === it.id}>
                  <Flag size={11} /> {reported === it.id ? "✓" : t("report_issue")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button className="btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft size={16} className="rtl:rotate-180" /> {t("prev")}
          </button>
          <span className="text-sm text-muted ltr-num">{page + 1} / {pages}</span>
          <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>
            {t("next")} <ChevronRight size={16} className="rtl:rotate-180" />
          </button>
        </div>
      )}
    </div>
  );
}
