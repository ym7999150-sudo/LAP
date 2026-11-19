"use client";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { STOCK_REAGENTS, getSubstance } from "@/lib/chem/substances";
import { CATEGORY_LABELS, componentsForLab, getComponentDef, type ComponentDef, type Lab } from "@/lib/registry";
import { useI18n } from "@/lib/i18n/client";
import { sfx } from "@/lib/client/sound";
import { prettyFormula } from "@/lib/chem/formula";
import { useEditor } from "../store";
import { SupportBadge } from "./SupportBadge";
import { isContainerType } from "@/lib/chem/engine";

const FAV_KEY = "labverse-favs";
function loadFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function Library({ lab, onAdded }: { lab: Lab; onAdded?: () => void }) {
  const { t, L } = useI18n();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"equipment" | "reagents">(lab === "chemistry" ? "reagents" : "equipment");
  const [favs, setFavs] = useState<string[]>(() => (typeof window === "undefined" ? [] : loadFavs()));
  const addObject = useEditor((s) => s.addObject);
  const readOnly = useEditor((s) => s.readOnly);

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    setFavs(next);
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
    } catch {}
  };

  const groups = useMemo(() => {
    const norm = q.trim().toLowerCase();
    const list = componentsForLab(lab).filter((c) => !norm || `${c.name.en} ${c.name.ar} ${c.type}`.toLowerCase().includes(norm));
    const map = new Map<string, ComponentDef[]>();
    const fav = list.filter((c) => favs.includes(c.type));
    if (fav.length) map.set("__fav", fav);
    for (const c of list) map.set(c.category, [...(map.get(c.category) ?? []), c]);
    return [...map.entries()];
  }, [lab, q, favs]);

  const add = (type: string) => {
    if (readOnly) return;
    addObject(type);
    sfx.place();
    onAdded?.();
  };

  return (
    <div className="flex h-full flex-col">
      {lab === "chemistry" && (
        <div className="grid grid-cols-2 gap-1 p-2">
          {(["equipment", "reagents"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-chem/20 text-chem ring-1 ring-chem/40" : "bg-surface-2 text-muted hover:text-ink"}`}>
              {k === "equipment" ? `🧪 ${t("equipment")}` : `⚗️ ${t("reagents")} (${STOCK_REAGENTS.length})`}
            </button>
          ))}
        </div>
      )}
      <div className="relative px-2 pb-2">
        <Search size={15} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input h-9 ps-8 text-sm" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search")} />
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-4">
        {tab === "equipment" ? (
          groups.map(([cat, items]) => (
            <div key={cat} className="mb-3">
              <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">{cat === "__fav" ? "★" : L(CATEGORY_LABELS[cat]) || cat}</div>
              <div className="grid gap-1">
                {items.map((c) => (
                  <div key={c.type} className="group flex items-center gap-1 rounded-lg border border-transparent hover:border-line hover:bg-surface-2">
                    <button onClick={() => add(c.type)} className="flex min-w-0 flex-1 flex-col items-start px-2.5 py-2 text-start" title={L(c.description)}>
                      <span className="truncate text-sm">{L(c.name)}</span>
                      <SupportBadge support={c.simulation.support} small />
                    </button>
                    <button onClick={() => toggleFav(c.type)} className="p-2 text-faint hover:text-warn" aria-label="favorite">
                      <Star size={14} fill={favs.includes(c.type) ? "currentColor" : "none"} className={favs.includes(c.type) ? "text-warn" : ""} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <ReagentShelf q={q} />
        )}
      </div>
    </div>
  );
}

const norm = (x: string) =>
  x
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟ]/g, "") // Arabic diacritics
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^ال|\sال/g, " ");

const GROUPS: { cls: string[]; label: { en: string; ar: string } }[] = [
  { cls: ["metal"], label: { en: "Metals", ar: "الفلزات" } },
  { cls: ["acid"], label: { en: "Acids", ar: "الأحماض" } },
  { cls: ["base"], label: { en: "Bases & alkalis", ar: "القواعد والقلويات" } },
  { cls: ["salt"], label: { en: "Salts", ar: "الأملاح" } },
  { cls: ["oxide", "catalyst"], label: { en: "Oxides & catalysts", ar: "الأكاسيد والعوامل الحفازة" } },
  { cls: ["nonmetal", "organic", "solvent"], label: { en: "Non-metals, organics & water", ar: "اللافلزات والمواد العضوية والماء" } },
  { cls: ["indicator"], label: { en: "Indicators", ar: "الأدلة" } },
];

/** Stock reagents grouped by type: tap one to pour / scoop it into the selected (or first) container. */
export function ReagentShelf({ q = "" }: { q?: string }) {
  const { t, L } = useI18n();
  const selection = useEditor((s) => s.selection);
  const objects = useEditor((s) => s.doc.objects);
  const chemOp = useEditor((s) => s.chemOp);
  const select = useEditor((s) => s.select);
  const containers = objects.filter((o) => isContainerType(o.type));
  const selected = containers.find((o) => selection.includes(o.id));
  const target = selected ?? containers[0];
  const query = norm(q.trim());
  const list = STOCK_REAGENTS.filter((s) => !query || norm(`${s.name.en} ${s.name.ar} ${s.formula ?? ""} ${s.id}`).includes(query));
  const add = (id: string) => {
    const s = getSubstance(id)!;
    if (!target) {
      sfx.error();
      return;
    }
    if (!selected) select(target.id);
    const solid = s.state === "s";
    chemOp(
      { kind: "add", containerId: target.id, substanceId: s.id, ...(solid ? { massG: s.stock?.defaultMassG } : { volumeMl: s.stock?.defaultVolumeMl, concentration: s.stock?.concentration }) },
      { kind: solid ? "add-solid" : "add-liquid", toId: target.id, color: s.tint > 0 ? s.color : "#cfe8ff", substanceId: s.id },
    );
  };
  return (
    <div>
      <p className={`mb-2 rounded-lg px-2 py-1.5 text-xs ${target ? "bg-ok/10 text-ok" : "bg-warn/10 text-warn"}`}>
        {target ? `→ ${t("add_to")}: ${L(getComponentDef(target.type)?.name)}${selected ? "" : ` (${L({ en: "first on the bench", ar: "أول وعاء على الطاولة" })})`}` : t("select_container")}
      </p>
      {list.length === 0 && <p className="px-1 text-xs text-faint">{t("empty_list")}</p>}
      {GROUPS.map((g) => {
        const items = list.filter((s) => g.cls.includes(s.cls));
        if (!items.length) return null;
        return (
          <div key={g.label.en} className="mb-3">
            <div className="sticky top-0 z-10 bg-surface/95 px-1 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-faint backdrop-blur">
              {L(g.label)} <span className="ltr-num">({items.length})</span>
            </div>
            <div className="grid gap-1">
              {items.map((s) => (
                <button key={s.id} onClick={() => add(s.id)} disabled={!target} className="flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-start transition-colors hover:border-line hover:bg-surface-2 disabled:opacity-50">
                  <span className="size-4 shrink-0 rounded-full border border-line-strong" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{L(s.name)}</span>
                    <span className="mono text-[11px] text-faint ltr-num">
                      {s.formula ? prettyFormula(s.formula) : "—"} · {s.state === "s" ? `${s.stock?.defaultMassG} g` : `${s.stock?.defaultVolumeMl} mL${s.stock?.concentration ? ` · ${s.stock.concentration} M` : ""}`}
                    </span>
                  </span>
                  {s.virtualOnly && <span className="chip border-danger/50 text-danger" title={t("virtual_only")}>!</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
