"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const rand = () => {
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return u[0]! / 2 ** 32;
};

/**
 * Peppered-moth style natural selection. Each generation, predators remove a share of each
 * colour depending on how visible it is against the background; survivors reproduce (with
 * a small mutation rate). Animated population and a history chart.
 */
export function NaturalSelectionSim() {
  const { L } = useI18n();
  const [env, setEnv] = useState<"light" | "dark">("dark");
  const [pop, setPop] = useState<boolean[]>(() => Array.from({ length: 60 }, (_, i) => i < 6)); // true = dark moth
  const [hist, setHist] = useState<number[]>([0.1]);
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = () =>
    setPop((p) => {
      const survive = p.filter((dark) => rand() > (dark === (env === "dark") ? 0.1 : 0.55));
      const next: boolean[] = [];
      while (next.length < 60 && survive.length) {
        const parent = survive[Math.floor(rand() * survive.length)]!;
        next.push(rand() < 0.02 ? !parent : parent);
      }
      while (next.length < 60) next.push(rand() < 0.5);
      setHist((h) => [...h.slice(-29), next.filter(Boolean).length / 60]);
      return next;
    });

  useEffect(() => {
    if (!running) return;
    let n = 0;
    timer.current = setInterval(() => {
      step();
      if (++n >= 20) setRunning(false);
    }, 450);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, env]); // eslint-disable-line react-hooks/exhaustive-deps

  const darkShare = pop.filter(Boolean).length / pop.length;
  return (
    <div className="panel p-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["light", "dark"] as const).map((e) => (
          <button key={e} onClick={() => setEnv(e)} className={`chip px-3 py-1.5 ${env === e ? "border-accent text-accent" : ""}`}>
            {e === "light" ? L({ en: "Light bark (clean air)", ar: "لحاء فاتح (هواء نظيف)" }) : L({ en: "Dark bark (sooty)", ar: "لحاء داكن (سخام)" })}
          </button>
        ))}
        <button className="btn btn-primary ms-auto" onClick={() => setRunning(true)} disabled={running}>
          {L({ en: "Run 20 generations", ar: "شغّل 20 جيلاً" })}
        </button>
        <button className="btn" onClick={() => { setPop(Array.from({ length: 60 }, (_, i) => i < 6)); setHist([0.1]); }}>
          ↺
        </button>
      </div>
      <div className={`mt-4 grid grid-cols-12 gap-1.5 rounded-xl p-3 transition-colors duration-700 ${env === "dark" ? "bg-stone-800" : "bg-stone-300"}`}>
        {pop.map((dark, i) => (
          <div key={i} className="flex aspect-square items-center justify-center transition-all duration-500">
            <svg viewBox="0 0 20 14" className="w-full">
              <ellipse cx="6" cy="7" rx="6" ry="5" fill={dark ? "#27272a" : "#e7e5e4"} stroke="#78716c" strokeWidth="0.6" />
              <ellipse cx="14" cy="7" rx="6" ry="5" fill={dark ? "#27272a" : "#e7e5e4"} stroke="#78716c" strokeWidth="0.6" />
              <rect x="9.3" y="3" width="1.4" height="8" rx="0.7" fill="#57534e" />
            </svg>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>{L({ en: "Share of dark moths", ar: "نسبة الفراشات الداكنة" })}</span>
          <span className="mono ltr-num">{Math.round(darkShare * 100)}%</span>
        </div>
        <svg viewBox="0 0 300 80" className="h-24 w-full rounded-lg bg-bg" style={{ direction: "ltr" }}>
          <polyline fill="none" stroke="#22d3ee" strokeWidth="2.5" points={hist.map((h, i) => `${(i / Math.max(1, hist.length - 1)) * 296 + 2},${78 - h * 74}`).join(" ")} />
        </svg>
      </div>
      <p className="mt-2 text-xs text-faint">{L({ en: "Model: predators catch 55% of poorly camouflaged moths and 10% of well-camouflaged ones each generation; 2% mutation.", ar: "النموذج: المفترسات تصطاد 55% من الفراشات ضعيفة التمويه و10% من جيدة التمويه كل جيل؛ مع طفرة 2%." })}</p>
    </div>
  );
}

const ALLELES = ["A", "B", "O"] as const;
type G = `${"A" | "B" | "O"}${"A" | "B" | "O"}`;
const GENOTYPES: G[] = ["AA", "AO", "BB", "BO", "AB", "OO"];
const show = (g: string) => g.replace(/A/g, "Iᴬ").replace(/B/g, "Iᴮ").replace(/O/g, "i");
const phenotype = (a: string, b: string) => {
  const s = new Set([a, b]);
  if (s.has("A") && s.has("B")) return "AB";
  if (s.has("A")) return "A";
  if (s.has("B")) return "B";
  return "O";
};

/** ABO blood group inheritance with co-dominance. */
export function BloodGroups() {
  const { L } = useI18n();
  const [m, setM] = useState<G>("AO");
  const [f, setF] = useState<G>("BO");
  const kids = [m[0]!, m[1]!].flatMap((a) => [f[0]!, f[1]!].map((b) => phenotype(a, b)));
  const counts = ["A", "B", "AB", "O"].map((p) => [p, kids.filter((k) => k === p).length / 4] as const);
  void ALLELES;
  const color: Record<string, string> = { A: "#ef4444", B: "#3b82f6", AB: "#a855f7", O: "#f59e0b" };
  return (
    <div className="panel p-5">
      <div className="grid grid-cols-2 gap-3">
        {[
          [m, setM, L({ en: "Mother", ar: "الأم" })],
          [f, setF, L({ en: "Father", ar: "الأب" })],
        ].map(([v, set, label], i) => (
          <label key={i} className="text-sm">
            <span className="mb-1 block text-muted">
              {label as string} · {L({ en: "group", ar: "فصيلة" })} <b>{phenotype((v as string)[0]!, (v as string)[1]!)}</b>
            </span>
            <select className="input mono" value={v as string} onChange={(e) => (set as (g: G) => void)(e.target.value as G)}>
              {GENOTYPES.map((g) => (
                <option key={g} value={g}>
                  {show(g)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" dir="ltr">
        {[m[0]!, m[1]!].flatMap((a, i) =>
          [f[0]!, f[1]!].map((b, j) => {
            const p = phenotype(a, b);
            return (
              <div key={`${i}${j}`} className="animate-in rounded-xl border p-3 text-center" style={{ borderColor: color[p], animationDelay: `${(i * 2 + j) * 0.08}s` }}>
                <div className="mono text-xs text-muted">{show(a + b)}</div>
                <div className="mt-1 text-2xl font-bold" style={{ color: color[p] }}>
                  {p}
                </div>
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {counts.map(([p, c]) => (
          <span key={p} className="chip py-1" style={{ borderColor: color[p], color: c ? color[p] : undefined, opacity: c ? 1 : 0.4 }}>
            {p}: {Math.round(c * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

const PAIR: Record<string, string> = { A: "T", T: "A", C: "G", G: "C" };
const BASE_COLOR: Record<string, string> = { A: "#ef4444", T: "#f59e0b", C: "#22c55e", G: "#3b82f6" };

/** Build the complementary strand base by base. */
export function DnaPairing() {
  const { L } = useI18n();
  const [strand] = useState(() => Array.from({ length: 10 }, () => "ATCG"[Math.floor(rand() * 4)]!));
  const [answer, setAnswer] = useState<(string | null)[]>(() => strand.map(() => null));
  const correct = answer.filter((a, i) => a === PAIR[strand[i]!]).length;
  const idx = answer.findIndex((a, i) => a !== PAIR[strand[i]!]);
  return (
    <div className="panel p-5">
      <div className="flex justify-center gap-1.5 overflow-x-auto pb-2" dir="ltr">
        {strand.map((b, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="grid size-9 place-items-center rounded-md font-bold text-black" style={{ background: BASE_COLOR[b] }}>
              {b}
            </div>
            <div className={`h-6 w-0.5 ${answer[i] === PAIR[b] ? "bg-ok" : "bg-line-strong"}`} />
            <div className={`grid size-9 place-items-center rounded-md border-2 font-bold ${answer[i] == null ? "border-dashed border-line-strong" : answer[i] === PAIR[b] ? "border-ok text-black" : "border-danger text-danger"} ${i === idx ? "ring-2 ring-accent" : ""}`} style={answer[i] === PAIR[b] ? { background: BASE_COLOR[answer[i]!] } : undefined}>
              {answer[i] ?? "?"}
            </div>
          </div>
        ))}
      </div>
      {idx >= 0 ? (
        <div className="mt-4 flex justify-center gap-2" dir="ltr">
          {["A", "T", "C", "G"].map((b) => (
            <button key={b} className="btn size-12 text-lg font-bold text-black" style={{ background: BASE_COLOR[b] }} onClick={() => setAnswer((a) => a.map((x, i) => (i === idx ? b : x)))}>
              {b}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center font-semibold text-ok">✓ {L({ en: "Complementary strand complete!", ar: "اكتمل الشريط المكمل!" })}</p>
      )}
      <p className="mt-3 text-center text-sm text-muted ltr-num">
        {correct}/{strand.length}
      </p>
    </div>
  );
}
