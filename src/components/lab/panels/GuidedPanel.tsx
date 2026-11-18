"use client";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lightbulb, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";
import { evaluateCriteria } from "@/lib/curriculum/criteria";
import { getExperiment, nextExperiment, UNITS } from "@/lib/curriculum/experiments";
import { experimentHref } from "@/lib/curriculum/links";
import { useI18n } from "@/lib/i18n/client";
import { useEditor } from "../store";

interface Outcome {
  passed: boolean;
  criteriaPassed: boolean;
  questionResults: Record<string, boolean>;
  reason?: string;
  xpGained: number;
  unlocked: never[];
  levelBefore: number;
  levelAfter: number;
}

export function GuidedPanel({ experimentId, onClose }: { experimentId: string; onClose?: () => void }) {
  const { t, L, dir } = useI18n();
  const { user, pushReward } = useSession();
  const exp = getExperiment(experimentId);
  const doc = useEditor((s) => s.doc);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    api<{ completed: string[] }>("/api/progress").then((r) => setDone(new Set(r.completed))).catch(() => {});
  }, [user, result]);
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const live = useMemo(() => (exp && exp.criteria !== "quiz-only" ? evaluateCriteria(exp.criteria, doc) : { passed: true }), [exp, doc]);
  if (!exp) return null;
  const unit = UNITS.find((u) => u.id === exp.unit);
  const next = nextExperiment(exp.id, done);

  const submit = async () => {
    if (!user) {
      setResult({ passed: false, criteriaPassed: live.passed, questionResults: {}, reason: t("sign_in_to_save"), xpGained: 0, unlocked: [], levelBefore: 0, levelAfter: 0 });
      return;
    }
    setBusy(true);
    try {
      const r = await api<Outcome>(`/api/experiments/${exp.id}/complete`, { body: { scene: exp.criteria === "quiz-only" ? undefined : doc, answers } });
      setResult(r);
      pushReward(r);
    } catch (e) {
      setResult({ passed: false, criteriaPassed: false, questionResults: {}, reason: e instanceof ApiError ? e.code : t("error_generic"), xpGained: 0, unlocked: [], levelBefore: 0, levelAfter: 0 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass flex h-full flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
      <div className="flex items-start gap-2 border-b border-line p-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-accent">{unit ? L(unit.title) : t("nav_experiments")}</div>
          <h2 className="font-semibold leading-snug">{L(exp.title)}</h2>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="close">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-3 text-sm">
        {unit && !unit.verified && <p className="rounded-lg bg-warn/10 p-2 text-[11px] text-warn">{t("curriculum_unverified")}</p>}
        <section>
          <h3 className="mb-1 text-xs font-semibold text-muted">{t("objective")}</h3>
          <p>{L(exp.objective)}</p>
        </section>
        <section>
          <h3 className="mb-1 text-xs font-semibold text-muted">{t("steps")}</h3>
          <ol className="list-decimal space-y-1 ps-5">
            {exp.steps.map((s, i) => (
              <li key={i}>{L(s)}</li>
            ))}
          </ol>
        </section>
        {exp.safety.length > 0 && (
          <section className="rounded-lg border border-warn/30 bg-warn/5 p-2">
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-warn">
              <ShieldAlert size={14} /> {t("safety")}
            </h3>
            <ul className="list-disc space-y-1 ps-5 text-xs">
              {exp.safety.map((s, i) => (
                <li key={i}>{L(s)}</li>
              ))}
            </ul>
          </section>
        )}
        {done.has(exp.id) && next && !result && (
          <Link href={experimentHref(next)} className="flex items-center justify-between rounded-lg border border-ok/40 bg-ok/5 p-2 text-xs text-ok">
            <span>✓ {t("completed")} — {t("next_challenge")}: {L(next.title)}</span>
            <ArrowIcon size={14} />
          </Link>
        )}
        <section className={`flex items-center gap-2 rounded-lg border p-2 ${live.passed ? "border-ok/40 bg-ok/5 text-ok" : "border-line text-muted"}`}>
          {live.passed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          <span className="text-xs">{L(exp.completion)}</span>
        </section>
        {exp.hints.length > 0 && (
          <section>
            <button className="flex items-center gap-1.5 text-xs text-accent" onClick={() => setShowHints((s) => !s)}>
              <Lightbulb size={14} /> {t("hints")}
            </button>
            {showHints && (
              <ul className="mt-1 list-disc ps-5 text-xs text-muted">
                {exp.hints.map((h, i) => (
                  <li key={i}>{L(h)}</li>
                ))}
              </ul>
            )}
          </section>
        )}
        {exp.questions.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold text-muted">{t("questions")}</h3>
            <div className="space-y-3">
              {exp.questions.map((q) => (
                <fieldset key={q.id}>
                  <legend className="mb-1.5 font-medium">{L(q.prompt)}</legend>
                  <div className="grid gap-1.5">
                    {q.options.map((o, i) => {
                      const chosen = answers[q.id] === i;
                      const verdict = result?.questionResults[q.id];
                      return (
                        <label key={i} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${chosen ? (verdict === undefined ? "border-accent bg-accent/10" : verdict ? "border-ok bg-ok/10" : "border-danger bg-danger/10") : "border-line hover:bg-surface-2"}`}>
                          <input type="radio" name={q.id} className="accent-[var(--color-accent)]" checked={chosen} onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                          {L(o)}
                        </label>
                      );
                    })}
                  </div>
                  {result && result.questionResults[q.id] === false && <p className="mt-1 text-xs text-warn">💡 {L(q.hint)}</p>}
                </fieldset>
              ))}
            </div>
          </section>
        )}
        {result && (
          <section className={`rounded-lg border p-3 ${result.passed ? "border-ok/50 bg-ok/10" : "border-warn/40 bg-warn/5"}`}>
            <div className="font-semibold">{result.passed ? `✓ ${t("completed")}` : t("not_yet")}</div>
            {!result.passed && result.reason && <p className="mt-1 text-xs text-muted">{result.reason}</p>}
            {result.passed && (
              <>
                <h3 className="mb-1 mt-2 text-xs font-semibold text-muted">{t("explanation")}</h3>
                <p className="text-xs">{L(exp.explanation)}</p>
                {next && (
                  <Link href={experimentHref(next)} className="btn btn-primary mt-3 w-full animate-in">
                    {t("next_challenge")}: {L(next.title)} <ArrowIcon size={15} />
                  </Link>
                )}
              </>
            )}
          </section>
        )}
      </div>
      <div className="border-t border-line p-3">
        <button className="btn btn-primary w-full" onClick={submit} disabled={busy}>
          {busy ? t("loading") : t("check_completion")}
        </button>
      </div>
    </div>
  );
}
