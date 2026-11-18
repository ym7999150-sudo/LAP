/**
 * Completion criteria. Pure functions over a validated scene document; the server
 * re-runs the simulation itself, so client-reported results are never trusted.
 */
import { replayChemistry, type ChemResult } from "@/lib/chem/engine";
import { findReactionById } from "@/lib/chem/reactions";
import type { SceneDocument } from "@/lib/scene/schema";
import { simulateCircuit, type SimulationResult } from "@/lib/sim/circuit/solver";

export interface Evaluation {
  passed: boolean;
  reason?: string;
}

interface Ctx {
  doc: SceneDocument;
  circuit: () => SimulationResult;
  chem: () => ChemResult;
}

function ctx(doc: SceneDocument): Ctx {
  let c: SimulationResult | undefined;
  let k: ChemResult | undefined;
  return { doc, circuit: () => (c ??= simulateCircuit(doc)), chem: () => (k ??= replayChemistry(doc)) };
}

const ofType = (d: SceneDocument, type: string) => d.objects.filter((o) => o.type === type);
const lit = (r: SimulationResult, id: string) => (r.components[id]?.activity ?? 0) > 0.15;

const CHECKS: Record<string, (c: Ctx) => Evaluation> = {
  "bulb-lit-with-switch": ({ doc, circuit }) => {
    const r = circuit();
    const bulbs = ofType(doc, "bulb").filter((b) => lit(r, b.id));
    const closedSwitch = ofType(doc, "switch").some((s) => s.props.closed === true && Math.abs(r.components[s.id]?.current ?? 0) > 1e-4);
    return { passed: r.closedCircuit && bulbs.length > 0 && closedSwitch, reason: "Need a lit bulb with current through a closed switch." };
  },
  "conductor-test": ({ doc, circuit }) => {
    const r = circuit();
    const sample = ofType(doc, "conductivity-tester").find((s) => Math.abs(r.components[s.id]?.current ?? 0) > 1e-3);
    return { passed: !!sample && ofType(doc, "bulb").some((b) => lit(r, b.id)), reason: "Need a conducting sample in series with a lit bulb." };
  },
  "meters-reading": ({ doc, circuit }) => {
    const r = circuit();
    const a = ofType(doc, "ammeter").some((m) => Math.abs(r.components[m.id]?.reading ?? 0) > 1e-4);
    const v = ofType(doc, "voltmeter").some((m) => Math.abs(r.components[m.id]?.reading ?? 0) > 1e-3);
    return { passed: a && v && !r.issues.some((i) => i.code === "short-circuit"), reason: "Both meters must show a reading without a short circuit." };
  },
  "ohms-law": ({ doc, circuit }) => {
    const r = circuit();
    for (const res of ofType(doc, "resistor")) {
      const i = Math.abs(r.components[res.id]?.current ?? 0);
      const v = Math.abs(r.components[res.id]?.voltage ?? 0);
      const R = Number(res.props.resistance);
      const amm = ofType(doc, "ammeter").map((m) => Math.abs(r.components[m.id]?.reading ?? 0));
      const vm = ofType(doc, "voltmeter").map((m) => Math.abs(r.components[m.id]?.reading ?? 0));
      const iMeas = amm.find((x) => Math.abs(x - i) / Math.max(i, 1e-9) < 0.02);
      const vMeas = vm.find((x) => Math.abs(x - v) / Math.max(v, 1e-9) < 0.02);
      if (i > 1e-4 && iMeas && vMeas && Math.abs(vMeas / iMeas - R) / R < 0.05) return { passed: true };
    }
    return { passed: false, reason: "Measure the current through and voltage across one resistor." };
  },
  "series-bulbs": ({ doc, circuit }) => {
    const r = circuit();
    const b = ofType(doc, "bulb").filter((x) => (r.components[x.id]?.activity ?? 0) > 0.05);
    if (b.length < 2) return { passed: false, reason: "Light two bulbs." };
    const i1 = Math.abs(r.components[b[0]!.id]!.current);
    const i2 = Math.abs(r.components[b[1]!.id]!.current);
    return { passed: Math.abs(i1 - i2) / Math.max(i1, 1e-9) < 0.01, reason: "The bulbs must carry the same current (series)." };
  },
  "parallel-bulbs": ({ doc, circuit }) => {
    const r = circuit();
    const b = ofType(doc, "bulb").filter((x) => lit(r, x.id));
    if (b.length < 2) return { passed: false, reason: "Light two bulbs." };
    const v1 = Math.abs(r.components[b[0]!.id]!.voltage);
    const v2 = Math.abs(r.components[b[1]!.id]!.voltage);
    const sameV = Math.abs(v1 - v2) / Math.max(v1, 1e-9) < 0.01;
    const src = ofType(doc, "battery").concat(ofType(doc, "dc-source")).map((s) => Math.abs(r.components[s.id]?.current ?? 0));
    const sum = Math.abs(r.components[b[0]!.id]!.current) + Math.abs(r.components[b[1]!.id]!.current);
    const kcl = src.some((i) => Math.abs(i - sum) / sum < 0.02);
    return { passed: sameV && kcl, reason: "Each bulb must be on its own branch across the source." };
  },
  "power-measure": ({ doc, circuit }) => {
    const r = circuit();
    const h = ofType(doc, "heater").some((x) => (r.components[x.id]?.power ?? 0) > 0.05);
    const ok = CHECKS["meters-reading"]!({ doc, circuit, chem: () => replayChemistry(doc) });
    return { passed: h && ok.passed, reason: "Power the heater with both meters reading." };
  },
  "electromagnet-on": ({ doc, circuit }) => {
    const r = circuit();
    return { passed: ofType(doc, "electromagnet").some((e) => (r.components[e.id]?.fieldT ?? 0) > 0.005), reason: "Energise the electromagnet." };
  },
  "led-safe": ({ doc, circuit }) => {
    const r = circuit();
    const ok = ofType(doc, "led").some((l) => {
      const c = r.components[l.id];
      return c?.state === "on" && c.current > 0.002 && c.current <= 0.025;
    });
    return { passed: ok, reason: "LED must be on with 2–25 mA." };
  },
  "neutralization-indicator": ({ chem }) => {
    const k = chem();
    const neutral = k.events.find((e) => e.kind === "reaction" && e.reactionId?.startsWith("neutralization"));
    const hasInd = neutral && (k.containers[neutral.containerId]?.dissolved.some((d) => d.id === "phenolphthalein") ?? false);
    return { passed: !!hasInd, reason: "Neutralise in a container with phenolphthalein." };
  },
  "precipitate-any": ({ chem }) => {
    const k = chem();
    return { passed: k.reactionsObserved.some((id) => findReactionById(id)?.observations.precipitate), reason: "Form a precipitate." };
  },
  "quiz-only": () => ({ passed: true }),
};

export function evaluateCriteria(criteria: string, doc: SceneDocument): Evaluation {
  const c = ctx(doc);
  if (criteria.startsWith("reaction:")) {
    const ids = criteria.slice(9).split("|");
    return { passed: c.chem().reactionsObserved.some((r) => ids.includes(r)), reason: "Perform the target reaction." };
  }
  const fn = CHECKS[criteria];
  if (!fn) return { passed: false, reason: "unknown criteria" };
  return fn(c);
}

/** Achievements that can be detected from any free-form scene (server validated). */
export function detectSceneAchievements(doc: SceneDocument): { achievements: string[]; reactions: string[] } {
  const c = ctx(doc);
  const out = new Set<string>();
  let reactions: string[] = [];
  if (doc.lab === "physics") {
    const r = c.circuit();
    const loads = doc.objects.filter((o) => ["bulb", "led", "motor", "buzzer", "heater"].includes(o.type));
    if (r.closedCircuit && loads.some((l) => (r.components[l.id]?.activity ?? 0) > 0.15)) out.add("first_valid_circuit");
    if (CHECKS["led-safe"]!(c).passed) out.add("led_master");
    if (CHECKS["electromagnet-on"]!(c).passed) out.add("electromagnet");
  } else {
    reactions = c.chem().reactionsObserved;
  }
  return { achievements: [...out], reactions };
}
