"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

type Kind = "plant" | "animal";
interface Organelle {
  id: string;
  name: { en: string; ar: string };
  job: { en: string; ar: string };
  in: Kind[];
}

const ORGANELLES: Organelle[] = [
  { id: "membrane", name: { en: "Cell membrane", ar: "الغشاء الخلوي" }, job: { en: "Controls what enters and leaves the cell.", ar: "يتحكم فيما يدخل الخلية ويخرج منها." }, in: ["plant", "animal"] },
  { id: "wall", name: { en: "Cell wall", ar: "الجدار الخلوي" }, job: { en: "Rigid cellulose layer that supports and protects plant cells.", ar: "طبقة صلبة من السليلوز تدعم الخلية النباتية وتحميها." }, in: ["plant"] },
  { id: "nucleus", name: { en: "Nucleus", ar: "النواة" }, job: { en: "Holds the DNA and controls the cell's activities.", ar: "تحتوي على الـDNA وتتحكم في أنشطة الخلية." }, in: ["plant", "animal"] },
  { id: "cytoplasm", name: { en: "Cytoplasm", ar: "السيتوبلازم" }, job: { en: "Jelly-like fluid where most reactions happen.", ar: "سائل هلامي تحدث فيه معظم التفاعلات." }, in: ["plant", "animal"] },
  { id: "mito", name: { en: "Mitochondria", ar: "الميتوكوندريا" }, job: { en: "Release energy from food by cellular respiration.", ar: "تطلق الطاقة من الغذاء بالتنفس الخلوي." }, in: ["plant", "animal"] },
  { id: "chloro", name: { en: "Chloroplasts", ar: "البلاستيدات الخضراء" }, job: { en: "Contain chlorophyll and carry out photosynthesis.", ar: "تحتوي على الكلوروفيل وتقوم بالبناء الضوئي." }, in: ["plant"] },
  { id: "vacuole", name: { en: "Large central vacuole", ar: "الفجوة العصارية الكبيرة" }, job: { en: "Stores water and keeps the plant cell firm.", ar: "تخزن الماء وتحافظ على صلابة الخلية النباتية." }, in: ["plant"] },
  { id: "ribo", name: { en: "Ribosomes", ar: "الريبوسومات" }, job: { en: "Build proteins.", ar: "تبني البروتينات." }, in: ["plant", "animal"] },
];

/** Interactive SVG cell: tap an organelle to learn what it does. */
export function CellExplorer() {
  const { L } = useI18n();
  const [kind, setKind] = useState<Kind>("plant");
  const [sel, setSel] = useState("nucleus");
  const o = ORGANELLES.find((x) => x.id === sel)!;
  const has = (id: string) => ORGANELLES.find((x) => x.id === id)!.in.includes(kind);
  const hl = (id: string) => (sel === id ? "#22d3ee" : undefined);
  const plant = kind === "plant";
  return (
    <div className="panel p-5">
      <div className="mb-4 flex gap-1 rounded-xl border border-line p-1">
        {(["plant", "animal"] as Kind[]).map((k) => (
          <button key={k} onClick={() => { setKind(k); if (!ORGANELLES.find((x) => x.id === sel)!.in.includes(k)) setSel("nucleus"); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${kind === k ? "bg-ok/15 text-ok" : "text-muted"}`}>
            {k === "plant" ? L({ en: "Plant cell", ar: "خلية نباتية" }) : L({ en: "Animal cell", ar: "خلية حيوانية" })}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <svg viewBox="0 0 400 300" className="w-full" role="img" aria-label={L({ en: "Cell diagram", ar: "رسم الخلية" })}>
          {plant ? (
            <>
              <rect x="20" y="20" width="360" height="260" rx="14" fill="#14532d" stroke={hl("wall") ?? "#4ade80"} strokeWidth={sel === "wall" ? 8 : 6} onClick={() => setSel("wall")} className="cursor-pointer" />
              <rect x="32" y="32" width="336" height="236" rx="10" fill="#1f3d2b" stroke={hl("membrane") ?? "#86efac"} strokeWidth="3" onClick={() => setSel("membrane")} className="cursor-pointer" />
              <rect x="150" y="70" width="180" height="150" rx="40" fill="#1e3a5f" stroke={hl("vacuole") ?? "#60a5fa"} strokeWidth="3" opacity="0.9" onClick={() => setSel("vacuole")} className="cursor-pointer" />
            </>
          ) : (
            <ellipse cx="200" cy="150" rx="180" ry="125" fill="#3b2430" stroke={hl("membrane") ?? "#f9a8d4"} strokeWidth="4" onClick={() => setSel("membrane")} className="cursor-pointer" />
          )}
          <rect x="0" y="0" width="0" height="0" onClick={() => setSel("cytoplasm")} />
          <g onClick={() => setSel("nucleus")} className="cursor-pointer">
            <circle cx={plant ? 95 : 190} cy={plant ? 110 : 140} r="38" fill="#4c1d95" stroke={hl("nucleus") ?? "#a78bfa"} strokeWidth="4" />
            <circle cx={plant ? 100 : 196} cy={plant ? 104 : 134} r="12" fill="#7c3aed" />
          </g>
          {[[80, 220], [300, 245], [plant ? 120 : 300, plant ? 250 : 110]].map(([x, y], i) => (
            <g key={i} onClick={() => setSel("mito")} className="cursor-pointer">
              <ellipse cx={x} cy={y} rx="24" ry="11" fill="#9a3412" stroke={hl("mito") ?? "#fb923c"} strokeWidth="3" />
              <path d={`M${x! - 16} ${y} q6 -8 10 0 t10 0 t10 0`} stroke="#fdba74" fill="none" strokeWidth="2" />
            </g>
          ))}
          {plant &&
            [[60, 60], [350, 60], [355, 240], [60, 255], [200, 255]].map(([x, y], i) => (
              <ellipse key={i} cx={x} cy={y} rx="18" ry="10" fill="#15803d" stroke={hl("chloro") ?? "#22c55e"} strokeWidth="3" onClick={() => setSel("chloro")} className="cursor-pointer" />
            ))}
          {[[250, 60], [270, 70], [60, 160], [330, 180], [130, 180], [240, 230], [100, 60]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill={hl("ribo") ?? "#fde68a"} onClick={() => setSel("ribo")} className="cursor-pointer" />
          ))}
        </svg>
        <div className="space-y-2">
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-3">
            <div className="font-semibold text-accent">{L(o.name)}</div>
            <p className="mt-1 text-sm">{L(o.job)}</p>
          </div>
          <ul className="grid gap-1 text-sm">
            {ORGANELLES.map((x) => (
              <li key={x.id}>
                <button disabled={!has(x.id)} onClick={() => setSel(x.id)} className={`w-full rounded-lg px-2 py-1.5 text-start ${sel === x.id ? "bg-surface-3" : "hover:bg-surface-2"} ${has(x.id) ? "" : "text-faint line-through"}`}>
                  {L(x.name)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
