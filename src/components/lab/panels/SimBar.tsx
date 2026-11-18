"use client";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, Pause, Play, XCircle } from "lucide-react";
import { useState } from "react";
import { getComponentDef } from "@/lib/registry";
import { ISSUE_TEXT } from "@/lib/i18n/dict";
import { useI18n } from "@/lib/i18n/client";
import { fmt } from "../models/physics";
import { useEditor } from "../store";
import { useSim } from "../useSimulation";
import { useChemFx } from "../chemFx";

export function SimBar({ lab }: { lab: "physics" | "chemistry" }) {
  const { t, L } = useI18n();
  const running = useEditor((s) => s.running);
  const setRunning = useEditor((s) => s.setRunning);
  const select = useEditor((s) => s.select);
  const objects = useEditor((s) => s.doc.objects);
  const circuit = useSim((s) => s.circuit);
  const msgs = useChemFx((s) => s.lastMessages);
  const [open, setOpen] = useState(false);

  if (lab === "chemistry") {
    const last = msgs[msgs.length - 1];
    return (
      <div className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm">
        <Info size={16} className="shrink-0 text-chem" />
        <span className={`line-clamp-2 ${last?.tone === "warn" ? "text-warn" : last?.tone === "ok" ? "text-ok" : "text-muted"}`}>{last ? L(last.text) : t("select_container")}</span>
      </div>
    );
  }

  const issues = circuit.issues.filter((i) => i.code !== "disconnected" || circuit.issues.length < 6);
  const errors = issues.filter((i) => i.severity === "error");
  const meters = objects.filter((o) => ["ammeter", "voltmeter", "ohmmeter", "multimeter"].includes(o.type));
  const StatusIcon = !running ? Pause : errors.length ? XCircle : circuit.closedCircuit ? CheckCircle2 : AlertTriangle;
  const statusColor = !running ? "text-muted" : errors.length ? "text-danger" : circuit.closedCircuit ? "text-ok" : "text-warn";

  return (
    <div className="text-sm">
      <div className="flex min-h-12 items-center gap-2 px-3 py-1.5">
        <button className={`btn ${running ? "" : "btn-primary"} h-9`} onClick={() => setRunning(!running)}>
          {running ? <Pause size={15} /> : <Play size={15} />} <span className="hidden sm:inline">{running ? t("pause") : t("run")}</span>
        </button>
        <StatusIcon size={17} className={`shrink-0 ${statusColor}`} />
        <span className={`min-w-0 flex-1 truncate ${statusColor}`}>
          {!running ? t("sim_paused") : errors.length ? L(ISSUE_TEXT[errors[0]!.code]) : circuit.closedCircuit ? t("circuit_closed") : t("circuit_open")}
        </span>
        <div className="hidden items-center gap-2 md:flex">
          {meters.slice(0, 4).map((m) => (
            <button key={m.id} onClick={() => select(m.id)} className="rounded-md border border-emerald-900 bg-[#04120d] px-2 py-1 font-mono text-xs text-emerald-300 ltr-num">
              {fmt(circuit.components[m.id]?.reading ?? null, circuit.components[m.id]?.readingUnit ?? "")}
            </button>
          ))}
        </div>
        <button className="btn btn-ghost h-9 px-2" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {t("issues")} <span className="chip ltr-num">{issues.length}</span> {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {open && (
        <div className="scroll-thin max-h-48 overflow-y-auto border-t border-line px-3 py-2">
          {issues.length === 0 ? (
            <p className="text-faint">{t("no_issues")}</p>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((i, k) => (
                <li key={k} className="flex items-start gap-2">
                  {i.severity === "error" ? <XCircle size={14} className="mt-0.5 text-danger" /> : i.severity === "warning" ? <AlertTriangle size={14} className="mt-0.5 text-warn" /> : <Info size={14} className="mt-0.5 text-muted" />}
                  <span className="flex-1">
                    {L(ISSUE_TEXT[i.code])}
                    {i.componentIds.map((id) => {
                      const o = objects.find((x) => x.id === id);
                      return o ? (
                        <button key={id} onClick={() => select(id)} className="ms-2 text-accent underline-offset-2 hover:underline">
                          {L(getComponentDef(o.type)?.name)}
                        </button>
                      ) : null;
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
