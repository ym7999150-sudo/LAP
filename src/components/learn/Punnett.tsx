"use client";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

type Genotype = "AA" | "Aa" | "aa";
const GENOTYPES: Genotype[] = ["AA", "Aa", "aa"];

/** Mendelian monohybrid cross: exact Punnett square plus a random-sampling simulation. */
export function PunnettSimulator() {
  const { L, locale } = useI18n();
  const [p1, setP1] = useState<Genotype>("Aa");
  const [p2, setP2] = useState<Genotype>("Aa");
  const [n, setN] = useState(100);
  const [sample, setSample] = useState<Record<Genotype, number> | null>(null);
  const g1 = [p1[0]!, p1[1]!];
  const g2 = [p2[0]!, p2[1]!];
  const norm = (a: string, b: string) => ([a, b].sort((x, y) => (x === "A" ? -1 : y === "A" ? 1 : 0)).join("") as Genotype);
  const grid = g1.map((a) => g2.map((b) => norm(a, b)));
  const expected = useMemo(() => {
    const c: Record<Genotype, number> = { AA: 0, Aa: 0, aa: 0 };
    grid.flat().forEach((g) => (c[g] += 0.25));
    return c;
  }, [p1, p2]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = () => {
    const c: Record<Genotype, number> = { AA: 0, Aa: 0, aa: 0 };
    const rand = () => {
      const u = new Uint32Array(1);
      crypto.getRandomValues(u);
      return u[0]! / 2 ** 32;
    };
    for (let i = 0; i < n; i++) c[norm(g1[rand() < 0.5 ? 0 : 1]!, g2[rand() < 0.5 ? 0 : 1]!)]++;
    setSample(c);
  };
  const label = (g: Genotype) => (g === "aa" ? L({ en: "short (recessive)", ar: "قصير (متنحٍ)" }) : L({ en: "tall (dominant)", ar: "طويل (سائد)" }));
  const pct = (x: number) => `${(x * 100).toFixed(locale === "ar" ? 0 : 0)}%`;

  return (
    <div className="panel p-5">
      <p className="text-sm text-muted">{L({ en: "Trait: pea-plant height. A = tall (dominant), a = short (recessive).", ar: "الصفة: طول نبات البازلاء. A = طويل (سائد)، a = قصير (متنحٍ)." })}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          [p1, setP1, L({ en: "Parent 1", ar: "الأب الأول" })],
          [p2, setP2, L({ en: "Parent 2", ar: "الأب الثاني" })],
        ].map(([v, set, lbl], i) => (
          <label key={i} className="text-sm">
            <span className="mb-1 block text-muted">{lbl as string}</span>
            <select className="input mono" value={v as string} onChange={(e) => { (set as (g: Genotype) => void)(e.target.value as Genotype); setSample(null); }}>
              {GENOTYPES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-center" dir="ltr">
        <table className="mono border-collapse text-center">
          <thead>
            <tr>
              <th className="size-14" />
              {g2.map((b, j) => <th key={j} className="size-14 text-lg text-chem">{b}</th>)}
            </tr>
          </thead>
          <tbody>
            {g1.map((a, i) => (
              <tr key={i}>
                <th className="size-14 text-lg text-accent">{a}</th>
                {grid[i]!.map((g, j) => (
                  <td key={j} className={`size-16 border border-line-strong text-lg ${g === "aa" ? "bg-warn/10 text-warn" : "bg-ok/10 text-ok"}`}>{g}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-2 text-sm">
        {GENOTYPES.map((g) => (
          <div key={g} className="flex items-center gap-3">
            <span className="mono w-8">{g}</span>
            <span className="w-32 truncate text-xs text-muted">{label(g)}</span>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-surface-3">
              <div className="absolute inset-y-0 start-0 bg-accent/40" style={{ width: pct(expected[g]) }} />
              {sample && <div className="absolute inset-y-1 start-0 bg-ok" style={{ width: pct(sample[g] / n) }} />}
            </div>
            <span className="mono w-28 text-end text-xs ltr-num">
              {pct(expected[g])}
              {sample ? ` · ${sample[g]}/${n}` : ""}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-muted">N</label>
        <input type="number" className="input h-9 w-24 ltr-num" min={4} max={10000} value={n} onChange={(e) => setN(Math.min(10000, Math.max(4, Number(e.target.value) || 4)))} />
        <button className="btn btn-primary" onClick={run}>{L({ en: "Simulate offspring", ar: "حاكِ الأبناء" })}</button>
      </div>
      <p className="mt-3 text-xs text-faint">{L({ en: "Bars: expected probability (light) vs simulated result (green). Larger N gets closer to the expected ratio.", ar: "الأشرطة: الاحتمال المتوقع (فاتح) مقابل نتيجة المحاكاة (أخضر). كلما زاد N اقتربت النتيجة من النسبة المتوقعة." })}</p>
    </div>
  );
}
