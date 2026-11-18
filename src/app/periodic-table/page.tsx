"use client";
import { useMemo, useState } from "react";
import { Page } from "@/components/ui/Page";
import { ELEMENT_DATA_SOURCE, ELEMENTS, type ElementCategory, type ElementData } from "@/lib/chem/elements";
import { useI18n } from "@/lib/i18n/client";

const CAT: Record<ElementCategory, { color: string; en: string; ar: string }> = {
  "alkali-metal": { color: "#f87171", en: "Alkali metals", ar: "الفلزات القلوية" },
  "alkaline-earth-metal": { color: "#fb923c", en: "Alkaline-earth metals", ar: "الفلزات القلوية الأرضية" },
  "transition-metal": { color: "#facc15", en: "Transition metals", ar: "الفلزات الانتقالية" },
  "post-transition-metal": { color: "#a3e635", en: "Post-transition metals", ar: "فلزات ما بعد الانتقالية" },
  metalloid: { color: "#34d399", en: "Metalloids", ar: "أشباه الفلزات" },
  nonmetal: { color: "#22d3ee", en: "Nonmetals", ar: "اللافلزات" },
  halogen: { color: "#60a5fa", en: "Halogens", ar: "الهالوجينات" },
  "noble-gas": { color: "#a78bfa", en: "Noble gases", ar: "الغازات النبيلة" },
  lanthanide: { color: "#f472b6", en: "Lanthanides", ar: "اللانثانيدات" },
  actinide: { color: "#e879f9", en: "Actinides", ar: "الأكتينيدات" },
  unknown: { color: "#94a3b8", en: "Unknown properties", ar: "خواص غير معروفة" },
};

export default function PeriodicTable() {
  const { t, L } = useI18n();
  const [sel, setSel] = useState<ElementData>(ELEMENTS[0]!);
  const [hl, setHl] = useState<ElementCategory | null>(null);
  const [q, setQ] = useState("");
  const match = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return null;
    return new Set(ELEMENTS.filter((e) => e.symbol.toLowerCase() === n || e.name.en.toLowerCase().includes(n) || e.name.ar.includes(q.trim()) || String(e.z) === n).map((e) => e.z));
  }, [q]);
  return (
    <Page title={t("nav_periodic")} subtitle={ELEMENT_DATA_SOURCE} wide>
      <input className="input mb-4 max-w-sm" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("search")} />
      <div className="scroll-thin overflow-x-auto pb-2" dir="ltr">
        <div className="grid min-w-[900px] gap-1" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gridTemplateRows: "repeat(10, auto)" }}>
          {ELEMENTS.map((e) => {
            const c = CAT[e.category];
            const dim = (hl && hl !== e.category) || (match && !match.has(e.z));
            return (
              <button
                key={e.z}
                onClick={() => setSel(e)}
                onMouseEnter={() => setSel(e)}
                style={{ gridColumn: e.grid.col, gridRow: e.grid.row, borderColor: c.color, background: sel.z === e.z ? c.color : `${c.color}1f` }}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-md border text-center transition-all ${dim ? "opacity-20" : ""} ${sel.z === e.z ? "text-black" : ""} ${e.grid.row >= 9 ? "mt-2" : ""}`}
                aria-label={`${e.name.en} ${e.symbol}`}
              >
                <span className="absolute start-1 top-0.5 text-[8px] opacity-70">{e.z}</span>
                <span className="text-sm font-bold leading-none">{e.symbol}</span>
                <span className="mt-0.5 hidden text-[7px] opacity-70 xl:block">{e.atomicMass}</span>
              </button>
            );
          })}
          <div style={{ gridColumn: "3 / span 10", gridRow: 1 }} className="flex flex-wrap items-start gap-1 p-1" dir="auto">
            {(Object.keys(CAT) as ElementCategory[]).map((k) => (
              <button key={k} onMouseEnter={() => setHl(k)} onMouseLeave={() => setHl(null)} onClick={() => setHl(hl === k ? null : k)} className="chip px-1.5 py-0 text-[10px]" style={{ borderColor: CAT[k].color, color: CAT[k].color }}>
                {L(CAT[k])}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="panel mt-5 grid gap-4 p-5 sm:grid-cols-[120px_1fr]">
        <div className="grid aspect-square place-items-center rounded-2xl border-2 text-center" style={{ borderColor: CAT[sel.category].color, background: `${CAT[sel.category].color}22` }}>
          <div>
            <div className="text-xs opacity-70 ltr-num">{sel.z}</div>
            <div className="text-4xl font-bold">{sel.symbol}</div>
            <div className="text-xs opacity-70 ltr-num">{sel.atomicMass}{sel.massIsMassNumber ? "*" : ""}</div>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold">{L(sel.name)}</h2>
          <p className="text-sm" style={{ color: CAT[sel.category].color }}>{L(CAT[sel.category])}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-faint">Z</dt><dd className="mono ltr-num">{sel.z}</dd></div>
            <div><dt className="text-faint">{L({ en: "Atomic mass", ar: "الكتلة الذرية" })}</dt><dd className="mono ltr-num">{sel.atomicMass}{sel.massIsMassNumber ? "*" : ""}</dd></div>
            <div><dt className="text-faint">{L({ en: "Period / group", ar: "الدورة / المجموعة" })}</dt><dd className="mono ltr-num">{sel.period} / {sel.group ?? "f"}</dd></div>
            <div className="col-span-2 sm:col-span-1"><dt className="text-faint">{L({ en: "Electron configuration", ar: "التوزيع الإلكتروني" })}</dt><dd className="mono ltr-num" dir="ltr">{sel.electronConfiguration}{sel.configurationPredicted ? " (predicted)" : ""}</dd></div>
          </dl>
          {sel.massIsMassNumber && <p className="mt-2 text-[11px] text-faint">* {L({ en: "No stable isotopes: mass number of a long-lived isotope.", ar: "لا توجد نظائر مستقرة: العدد الكتلي لنظير طويل العمر." })}</p>}
        </div>
      </div>
    </Page>
  );
}
