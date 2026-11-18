"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/client";

/** Eon/era boundaries from the ICS International Chronostratigraphic Chart (rounded, millions of years ago). */
const ERAS = [
  {
    id: "precambrian",
    start: 4600,
    end: 539,
    color: "#7c3aed",
    name: { en: "Precambrian", ar: "ما قبل الكمبري" },
    life: { en: "Single-celled life; stromatolites built by cyanobacteria; late soft-bodied animals.", ar: "حياة وحيدة الخلية؛ الستروماتوليت التي بنتها البكتيريا الزرقاء؛ حيوانات رخوة في آخرها." },
    fossils: [{ en: "Stromatolites", ar: "الستروماتوليت" }],
  },
  {
    id: "paleozoic",
    start: 539,
    end: 252,
    color: "#0ea5e9",
    name: { en: "Paleozoic (ancient life)", ar: "حقب الحياة القديمة" },
    life: { en: "Explosion of animal life in the seas, first fish, land plants, amphibians and reptiles. Ended with the largest mass extinction.", ar: "انفجار الحياة الحيوانية في البحار، أول الأسماك، النباتات البرية، البرمائيات والزواحف. انتهى بأكبر انقراض جماعي." },
    fossils: [{ en: "Trilobites", ar: "ثلاثيات الفصوص" }, { en: "Tree ferns", ar: "السرخسيات الشجرية" }],
  },
  {
    id: "mesozoic",
    start: 252,
    end: 66,
    color: "#22c55e",
    name: { en: "Mesozoic (middle life)", ar: "حقب الحياة الوسطى" },
    life: { en: "Age of reptiles: dinosaurs, ammonites, first mammals and birds, first flowering plants. Ended 66 million years ago.", ar: "عصر الزواحف: الديناصورات والأمونيت، أول الثدييات والطيور، أول النباتات الزهرية. انتهى قبل 66 مليون سنة." },
    fossils: [{ en: "Ammonites", ar: "الأمونيت" }, { en: "Dinosaurs", ar: "الديناصورات" }],
  },
  {
    id: "cenozoic",
    start: 66,
    end: 0,
    color: "#f59e0b",
    name: { en: "Cenozoic (recent life)", ar: "حقب الحياة الحديثة" },
    life: { en: "Age of mammals. In Egypt, Wadi Al-Hitan (Valley of the Whales) preserves ~40-million-year-old whale fossils with hind legs.", ar: "عصر الثدييات. في مصر يحفظ وادي الحيتان حفريات حيتان عمرها نحو 40 مليون سنة لها أرجل خلفية." },
    fossils: [{ en: "Basilosaurus (Wadi Al-Hitan)", ar: "باسيلوصورس (وادي الحيتان)" }, { en: "Nummulites", ar: "النيموليت" }],
  },
];

export function GeologicTimeline() {
  const { L } = useI18n();
  const [sel, setSel] = useState("mesozoic");
  const era = ERAS.find((e) => e.id === sel)!;
  const total = 4600;
  return (
    <div className="panel p-5">
      <div className="flex h-14 overflow-hidden rounded-xl border border-line" dir="ltr" role="tablist">
        {ERAS.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={sel === e.id}
            onClick={() => setSel(e.id)}
            className={`relative min-w-[56px] text-[11px] font-semibold text-black/80 transition-opacity ${sel === e.id ? "" : "opacity-60 hover:opacity-90"}`}
            style={{ background: e.color, flexGrow: Math.max(0.12, (e.start - e.end) / total) * 10 }}
          >
            {L(e.name).split(" (")[0]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-faint">{L({ en: "Precambrian is shrunk to fit; it spans ~88% of Earth's history.", ar: "تم تصغير ما قبل الكمبري للعرض؛ وهو يمثل نحو 88% من تاريخ الأرض." })}</p>
      <div className="mt-5">
        <h3 className="text-lg font-semibold" style={{ color: era.color }}>{L(era.name)}</h3>
        <p className="mono mt-1 text-sm text-muted ltr-num">{era.start} → {era.end} Ma</p>
        <p className="mt-3 text-sm leading-relaxed">{L(era.life)}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {era.fossils.map((f, i) => (
            <span key={i} className="chip py-1" style={{ borderColor: era.color, color: era.color }}>{L(f)}</span>
          ))}
        </div>
      </div>
      <p className="mt-5 text-[11px] text-faint">Source: International Commission on Stratigraphy, International Chronostratigraphic Chart (values rounded).</p>
    </div>
  );
}
