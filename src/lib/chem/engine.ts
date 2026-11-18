/**
 * Deterministic chemistry engine.
 * State is derived by replaying a list of operations (add / pour / heat / empty),
 * which lets the server re-run an experiment to validate rewards.
 *
 * Simplifications (shown in the UI):
 *  - Reactions go to completion with the limiting reagent.
 *  - pH is computed from excess strong acid/base only; otherwise a tabulated hint is used.
 *  - Temperature change is computed only for reactions with an established ΔH.
 *  - Heating raises temperature at a fixed virtual rate; liquids cap at 100 °C.
 */
import { getComponentDef } from "@/lib/registry";
import type { ChemOp, SceneDocument } from "@/lib/scene/schema";
import { GENERATED, heatOutcome, pairOutcome, waterOutcome } from "./generic";
import { NO_REACTIONS, REACTIONS, registerGeneratedStore, type ReactionDef } from "./reactions";

registerGeneratedStore(GENERATED);
import { getSubstance, substanceMolarMass } from "./substances";

const EPS = 1e-9;
const ROOM_TEMP = 22;
const WATER_HEAT_CAPACITY = 4.18; // J/(g·K)

export interface ContainerState {
  id: string;
  capacityMl: number;
  volumeMl: number;
  tempC: number;
  /** Moles of each substance (water is tracked by volume, not moles). */
  mol: Record<string, number>;
}

export interface ChemEvent {
  opIndex: number;
  containerId: string;
  kind:
    | "reaction"
    | "no-reaction"
    | "unsupported"
    | "needs-condition"
    | "overflow"
    | "virtual-only"
    | "no-heat-source"
    | "invalid";
  reactionId?: string;
  extentMol?: number;
  substances?: string[];
  tempChange?: number;
  message?: { en: string; ar: string };
}

export interface ContainerView extends ContainerState {
  pH: number | null;
  pHMethod: "strong-acid-base" | "hint" | "neutral" | null;
  liquidColor: string;
  liquidOpacity: number;
  solids: { id: string; mol: number; massG: number | null; color: string }[];
  dissolved: { id: string; mol: number; concentrationM: number | null }[];
  indicatorColor: string | null;
}

export interface ChemResult {
  containers: Record<string, ContainerView>;
  events: ChemEvent[];
  reactionsObserved: string[];
}

export function isContainerType(type: string) {
  return getComponentDef(type)?.simulation.model === "container";
}

function emptyContainer(id: string, capacityMl: number): ContainerState {
  return { id, capacityMl, volumeMl: 0, tempC: ROOM_TEMP, mol: {} };
}

/* ------------------------------ pH & colour ------------------------------ */

export function computePH(c: ContainerState): { pH: number | null; method: ContainerView["pHMethod"] } {
  if (c.volumeMl <= EPS) return { pH: null, method: null };
  let net = 0;
  let hint: number | null = null;
  let hintMol = 0;
  for (const [id, n] of Object.entries(c.mol)) {
    const s = getSubstance(id);
    if (!s || n <= EPS) continue;
    if (s.state === "s" || s.state === "g") continue;
    if (s.strongAcidH) net += s.strongAcidH * n;
    if (s.strongBaseOH) net -= s.strongBaseOH * n;
    if (s.phHint !== undefined && s.id !== "water" && n > hintMol) {
      hint = s.phHint;
      hintMol = n;
    }
  }
  const L = c.volumeMl / 1000;
  if (net > 1e-7 * L) return { pH: clamp(-Math.log10(net / L), 0, 14), method: "strong-acid-base" };
  if (net < -1e-7 * L) return { pH: clamp(14 + Math.log10(-net / L), 0, 14), method: "strong-acid-base" };
  if (hint !== null) return { pH: hint, method: "hint" };
  return { pH: 7, method: "neutral" };
}

export function indicatorColor(indicator: string, pH: number): string | null {
  switch (indicator) {
    case "phenolphthalein":
      if (pH < 8.2) return null;
      return pH < 10 ? "#ff8cc6" : "#ff2d95";
    case "methyl-orange":
      return pH < 3.1 ? "#e53935" : pH > 4.4 ? "#fbc02d" : "#fb8c00";
    case "litmus":
      return pH < 4.5 ? "#d32f2f" : pH > 8.3 ? "#3949ab" : "#7d4fa0";
    case "universal-indicator": {
      const scale = ["#d50000", "#e53935", "#f4511e", "#fb8c00", "#ffa726", "#fdd835", "#c0ca33", "#43a047", "#00897b", "#0097a7", "#1e88e5", "#3949ab", "#5e35b1", "#6a1b9a", "#4a148c"];
      return scale[Math.round(clamp(pH, 0, 14))]!;
    }
    default:
      return null;
  }
}

function mixColors(parts: { color: string; w: number }[]): string {
  const total = parts.reduce((s, p) => s + p.w, 0);
  if (total <= 0) return "#d8ecff";
  let r = 0,
    g = 0,
    b = 0;
  for (const p of parts) {
    const n = parseInt(p.color.slice(1), 16);
    r += ((n >> 16) & 255) * p.w;
    g += ((n >> 8) & 255) * p.w;
    b += (n & 255) * p.w;
  }
  const h = (x: number) => Math.round(x / total).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function viewContainer(c: ContainerState): ContainerView {
  const { pH, method } = computePH(c);
  const L = c.volumeMl / 1000;
  const solids: ContainerView["solids"] = [];
  const dissolved: ContainerView["dissolved"] = [];
  const colorParts: { color: string; w: number }[] = [];
  let indColor: string | null = null;
  for (const [id, n] of Object.entries(c.mol)) {
    const s = getSubstance(id);
    if (!s || n <= EPS) continue;
    if (s.state === "s") {
      const M = substanceMolarMass(s);
      solids.push({ id, mol: n, massG: M ? n * M : null, color: s.color });
      continue;
    }
    if (s.state === "g") continue;
    dissolved.push({ id, mol: n, concentrationM: L > 0 ? n / L : null });
    if (s.cls === "indicator") {
      if (pH !== null) {
        const ic = indicatorColor(id, pH);
        if (ic) indColor = ic;
        else if (id !== "phenolphthalein") indColor = s.color;
      }
      continue;
    }
    if (s.tint > 0 && L > 0) colorParts.push({ color: s.color, w: s.tint * Math.min(1, n / L / 0.5) });
  }
  const tintSum = colorParts.reduce((a, p) => a + p.w, 0);
  const liquidColor = indColor ?? mixColors(colorParts);
  const liquidOpacity = indColor ? 0.8 : clamp(0.28 + tintSum * 0.6, 0.28, 0.85);
  return { ...c, pH, pHMethod: method, liquidColor, liquidOpacity, solids, dissolved, indicatorColor: indColor };
}

/* ------------------------------ reactions ------------------------------ */

function reactantAvailable(c: ContainerState, r: ReactionDef, id: string) {
  if (id === "water") return c.volumeMl > EPS && !!r.conditions.waterIsSolvent;
  if (id === "o2" && r.conditions.oxygenFromAir) return true;
  return (c.mol[id] ?? 0) > EPS;
}

function conditionsMet(c: ContainerState, r: ReactionDef) {
  if (r.conditions.minTempC !== undefined && c.tempC < r.conditions.minTempC) return false;
  if (r.conditions.catalyst && (c.mol[r.conditions.catalyst] ?? 0) <= EPS) return false;
  return true;
}

/** Apply one reaction to completion with the limiting reagent. Returns false if nothing reacted. */
function applyReaction(c: ContainerState, r: ReactionDef, opIndex: number, events: ChemEvent[], observed: Set<string>): boolean {
  if (!r.reactants.every((t) => reactantAvailable(c, r, t.id))) return false;
  if (!conditionsMet(c, r)) return false;
  // Limiting reagent (solvent water and atmospheric O2 are in excess).
  let extent = Infinity;
  for (const t of r.reactants) {
    if (t.id === "water" && r.conditions.waterIsSolvent) continue;
    if (t.id === "o2" && r.conditions.oxygenFromAir) continue;
    extent = Math.min(extent, (c.mol[t.id] ?? 0) / t.coeff);
  }
  if (!Number.isFinite(extent) || extent <= EPS) return false;
  for (const t of r.reactants) {
    if (t.id === "water" || (t.id === "o2" && r.conditions.oxygenFromAir)) continue;
    c.mol[t.id] = Math.max(0, (c.mol[t.id] ?? 0) - t.coeff * extent);
    if (c.mol[t.id]! <= EPS) delete c.mol[t.id];
  }
  for (const p of r.products) {
    if (p.id === "water") continue; // solvent volume change neglected
    const s = getSubstance(p.id);
    if (s?.state === "g") continue; // gases escape from the open container
    c.mol[p.id] = (c.mol[p.id] ?? 0) + p.coeff * extent;
  }
  let tempChange: number | undefined;
  if (r.deltaH !== undefined && c.volumeMl > EPS) {
    tempChange = (-r.deltaH * 1000 * extent) / (c.volumeMl * WATER_HEAT_CAPACITY);
    c.tempC = Math.min(100, c.tempC + tempChange);
  }
  events.push({ opIndex, containerId: c.id, kind: "reaction", reactionId: r.id, extentMol: extent, tempChange });
  observed.add(r.id);
  return true;
}

const hasCurated = (a: string, b: string) => REACTIONS.some((r) => r.reactants.some((t) => t.id === a) && r.reactants.some((t) => t.id === b));
const curatedWater = (a: string) => REACTIONS.some((r) => r.conditions.waterIsSolvent && r.reactants.some((t) => t.id === a));
const curatedHeat = (a: string) => REACTIONS.some((r) => r.reactants.length === 1 && r.reactants[0]!.id === a && r.conditions.minTempC !== undefined);

function runReactions(c: ContainerState, opIndex: number, events: ChemEvent[], observed: Set<string>) {
  for (let pass = 0; pass < 16; pass++) {
    let fired = false;
    // 1) Curated, hand-validated reactions (with their specific observations).
    for (const r of REACTIONS) if (applyReaction(c, r, opIndex, events, observed)) fired = true;
    // 2) Rule-generated reactions for every remaining pair, and with the solvent water.
    const ids = Object.keys(c.mol).filter((id) => (c.mol[id] ?? 0) > EPS);
    for (let i = 0; i < ids.length && !fired; i++) {
      const a = ids[i]!;
      if (c.volumeMl > EPS && !curatedWater(a)) {
        const w = waterOutcome(a);
        if (w?.kind === "reaction" && applyReaction(c, w.def, opIndex, events, observed)) fired = true;
      }
      for (let j = i + 1; j < ids.length && !fired; j++) {
        const b = ids[j]!;
        if (hasCurated(a, b)) continue;
        // Only substances that are free to meet react: at least one must be dissolved, or it is heated solid–solid.
        const sa = getSubstance(a);
        const sb = getSubstance(b);
        if (sa?.state === "s" && sb?.state === "s" && c.volumeMl <= EPS) continue;
        const o = pairOutcome(a, b);
        if (o.kind === "reaction" && applyReaction(c, o.def, opIndex, events, observed)) fired = true;
      }
    }
    // 3) Thermal decomposition of solids that are hot enough.
    if (!fired)
      for (const a of Object.keys(c.mol)) {
        if (curatedHeat(a)) continue;
        const h = heatOutcome(a);
        if (h && c.tempC >= h.minTempC && h.outcome.kind === "reaction" && applyReaction(c, h.outcome.def, opIndex, events, observed)) {
          fired = true;
          break;
        }
      }
    if (!fired) break;
  }
}

const REACTIVE_CLASSES = new Set(["acid", "base", "metal", "salt", "oxide", "nonmetal", "catalyst", "organic"]);

function reactantAvailableLoose(c: ContainerState, id: string) {
  return (c.mol[id] ?? 0) > EPS;
}

function reportPairs(c: ContainerState, added: string[], opIndex: number, events: ChemEvent[]) {
  const present = Object.keys(c.mol).filter((id) => (c.mol[id] ?? 0) > EPS && REACTIVE_CLASSES.has(getSubstance(id)?.cls ?? ""));
  const seen = new Set<string>();
  for (const a of added) {
    if (!REACTIVE_CLASSES.has(getSubstance(a)?.cls ?? "")) continue;
    for (const b of present) {
      if (a === b) continue;
      const key = [a, b].sort().join("+");
      if (seen.has(key)) continue;
      seen.add(key);
      const pending = REACTIONS.find((r) => r.reactants.some((t) => t.id === a) && r.reactants.some((t) => t.id === b));
      if (pending) {
        if (!conditionsMet(c, pending)) {
          const msg = pending.conditions.minTempC
            ? { en: `Requires heating to about ${pending.conditions.minTempC} °C.`, ar: `يتطلب التسخين إلى نحو ${pending.conditions.minTempC} °م.` }
            : { en: `Requires a catalyst (${pending.conditions.catalyst}).`, ar: `يتطلب عاملاً حفازاً (${pending.conditions.catalyst}).` };
          events.push({ opIndex, containerId: c.id, kind: "needs-condition", reactionId: pending.id, substances: [a, b], message: msg });
        }
        continue;
      }
      const none = NO_REACTIONS.find((n) => n.reactants.includes(a) && n.reactants.includes(b));
      if (none) {
        events.push({ opIndex, containerId: c.id, kind: "no-reaction", substances: [a, b], message: none.explanation });
        continue;
      }
      // Rule-based outcome: always defined (a reaction already applied, or a stated "no reaction").
      const o = pairOutcome(a, b);
      if (o.kind === "none") events.push({ opIndex, containerId: c.id, kind: "no-reaction", substances: [a, b], message: o.explanation });
      else if (!o.def.reactants.every((t) => t.id === "water" || reactantAvailableLoose(c, t.id)) && !events.some((e) => e.reactionId === o.def.id))
        events.push({ opIndex, containerId: c.id, kind: "needs-condition", reactionId: o.def.id, substances: [a, b], message: { en: "These react, but one reactant was already used up.", ar: "هاتان المادتان تتفاعلان لكن إحدى المادتين استُهلكت بالفعل." } });
    }
  }
}

/* ------------------------------ replay ------------------------------ */

export function replayChemistry(doc: Pick<SceneDocument, "objects" | "chemistry">): ChemResult {
  const containers = new Map<string, ContainerState>();
  for (const o of doc.objects) {
    if (!isContainerType(o.type)) continue;
    const cap = typeof o.props.capacity === "number" ? o.props.capacity : 250;
    containers.set(o.id, emptyContainer(o.id, cap));
  }
  const heatSourceLit = doc.objects.some((o) => getComponentDef(o.type)?.simulation.model === "heat-source" && o.props.lit !== false);
  const events: ChemEvent[] = [];
  const observed = new Set<string>();

  doc.chemistry.operations.forEach((op: ChemOp, i) => {
    switch (op.kind) {
      case "add": {
        const c = containers.get(op.containerId);
        const s = getSubstance(op.substanceId);
        if (!c || !s || !s.stock) {
          events.push({ opIndex: i, containerId: op.containerId, kind: "invalid" });
          return;
        }
        if (s.virtualOnly) events.push({ opIndex: i, containerId: c.id, kind: "virtual-only", substances: [s.id] });
        if (s.state === "s") {
          const M = substanceMolarMass(s);
          const m = op.massG ?? s.stock.defaultMassG ?? 1;
          if (M) c.mol[s.id] = (c.mol[s.id] ?? 0) + m / M;
        } else {
          let v = op.volumeMl ?? s.stock.defaultVolumeMl ?? 10;
          const free = c.capacityMl - c.volumeMl;
          if (v > free) {
            events.push({ opIndex: i, containerId: c.id, kind: "overflow" });
            v = Math.max(0, free);
          }
          c.volumeMl += v;
          if (s.id !== "water") {
            if (s.state === "aq") {
              const conc = op.concentration ?? s.stock.concentration ?? 0.001;
              c.mol[s.id] = (c.mol[s.id] ?? 0) + (conc * v) / 1000;
            } else if (s.formula) {
              const M = substanceMolarMass(s)!;
              const density = s.id === "ethanol" ? 0.789 : 1;
              c.mol[s.id] = (c.mol[s.id] ?? 0) + (v * density) / M;
            }
          }
        }
        runReactions(c, i, events, observed);
        reportPairs(c, [s.id], i, events);
        return;
      }
      case "pour": {
        const a = containers.get(op.fromId);
        const b = containers.get(op.toId);
        if (!a || !b || a === b) {
          events.push({ opIndex: i, containerId: op.toId, kind: "invalid" });
          return;
        }
        if (a.volumeMl <= EPS && Object.keys(a.mol).length === 0) return;
        let v = Math.min(op.volumeMl, a.volumeMl);
        const free = b.capacityMl - b.volumeMl;
        if (v > free) {
          events.push({ opIndex: i, containerId: b.id, kind: "overflow" });
          v = Math.max(0, free);
        }
        const f = a.volumeMl > EPS ? v / a.volumeMl : 1;
        const moved: string[] = [];
        // Temperature mixes by volume.
        if (b.volumeMl + v > EPS) b.tempC = (b.tempC * b.volumeMl + a.tempC * v) / (b.volumeMl + v);
        for (const [id, n] of Object.entries(a.mol)) {
          const s = getSubstance(id);
          // Bulk solids (metal pieces, powders) only move when the container is emptied completely.
          const bulkSolid = s?.state === "s" && (s.cls === "metal" || s.cls === "catalyst" || s.cls === "nonmetal") && f < 0.999;
          if (bulkSolid) continue;
          const dn = n * f;
          a.mol[id] = n - dn;
          if (a.mol[id]! <= EPS) delete a.mol[id];
          b.mol[id] = (b.mol[id] ?? 0) + dn;
          moved.push(id);
        }
        a.volumeMl -= v;
        b.volumeMl += v;
        runReactions(b, i, events, observed);
        reportPairs(b, moved, i, events);
        return;
      }
      case "heat": {
        const c = containers.get(op.containerId);
        if (!c) return;
        if (!heatSourceLit) {
          events.push({ opIndex: i, containerId: c.id, kind: "no-heat-source" });
          return;
        }
        const liquid = c.volumeMl > EPS;
        c.tempC = Math.min(liquid ? 100 : 500, c.tempC + op.seconds * (liquid ? 2 : 10));
        runReactions(c, i, events, observed);
        return;
      }
      case "empty": {
        const c = containers.get(op.containerId);
        if (c) containers.set(c.id, emptyContainer(c.id, c.capacityMl));
        return;
      }
    }
  });

  const views: Record<string, ContainerView> = {};
  for (const [id, c] of containers) views[id] = viewContainer(c);
  return { containers: views, events, reactionsObserved: [...observed] };
}

function clamp(x: number, a: number, b: number) {
  return Math.min(b, Math.max(a, x));
}
