/**
 * LabVerse DC circuit solver (Modified Nodal Analysis).
 *
 * - Independent of React / Three.js so it runs in tests and on the server
 *   (the server re-runs it to validate rewards; client results are never trusted).
 * - Each component terminal is its own node; every wire is a 1 mΩ resistor, so
 *   per-wire currents are physically meaningful and drive current-flow visuals.
 * - Batteries are ideal EMFs in series with internal resistance (no ideal
 *   voltage-source loops are possible, which keeps the MNA matrix regular).
 * - Diodes/LEDs use a piecewise-linear model solved by state iteration.
 * - Fuses blow when over-current and the circuit is re-solved.
 * - Capacitors are open and inductors are their winding resistance (DC steady state).
 */
import { getComponentDef } from "@/lib/registry";
import type { SceneDocument, SceneObject } from "@/lib/scene/schema";
import { solveDense } from "./linalg";

export const WIRE_RESISTANCE = 1e-3;
export const SWITCH_CLOSED_RESISTANCE = 1e-3;
export const AMMETER_RESISTANCE = 0.01;
export const VOLTMETER_RESISTANCE = 1e7;
export const OHMMETER_TEST_CURRENT = 1e-3;
export const OHMMETER_OVERLOAD = 1e8;
export const GMIN = 1e-12;
const DIODE_OFF_G = 1e-9;
const CONDUCTING_THRESHOLD = 1e-6;

export const MATERIAL_RESISTANCE: Record<string, { r: number; conductor: boolean }> = {
  copper: { r: 0.01, conductor: true },
  iron: { r: 0.05, conductor: true },
  graphite: { r: 5, conductor: true },
  plastic: { r: 1e12, conductor: false },
  wood: { r: 1e11, conductor: false },
  glass: { r: 1e13, conductor: false },
  rubber: { r: 1e13, conductor: false },
};

export const LED_VF: Record<string, number> = { red: 1.8, yellow: 2.0, green: 2.1, blue: 3.0 };

export type IssueCode =
  | "no-source"
  | "short-circuit"
  | "open-circuit"
  | "disconnected"
  | "partially-connected"
  | "unsupported-component"
  | "fuse-blown"
  | "led-overcurrent"
  | "led-reverse"
  | "bulb-overvoltage"
  | "ohmmeter-live"
  | "non-convergence"
  | "singular";

export interface Issue {
  code: IssueCode;
  severity: "error" | "warning" | "info";
  componentIds: string[];
  /** Parameters for localised message templates. */
  params?: Record<string, string | number>;
}

export interface ComponentResult {
  /** Current through the component, A (positive a→b / anode→cathode / + delivered for sources). */
  current: number;
  /** Voltage across the component, V. */
  voltage: number;
  /** Power absorbed (positive) or delivered (sources report delivered power as positive). */
  power: number;
  /** 0..1 visual activity (bulb glow, LED brightness, motor speed, buzzer). */
  activity?: number;
  /** Meter reading in SI units; null means overload / not applicable. */
  reading?: number | null;
  readingUnit?: "A" | "V" | "Ω" | "W";
  /** Magnetic flux density indicator for electromagnets, tesla. */
  fieldT?: number;
  state?: "on" | "off" | "blown" | "open" | "closed" | "unsupported";
}

export interface SimulationResult {
  ok: boolean;
  nodeVoltages: Record<string, number>; // keyed "objectId:terminalId"
  components: Record<string, ComponentResult>;
  wires: Record<string, { current: number; conducting: boolean }>;
  issues: Issue[];
  /** True when at least one source drives a non-trivial current with no short. */
  closedCircuit: boolean;
  blownFuses: string[];
  iterations: number;
}

/* ------------------------------------------------------------------ */

type Elem =
  | { kind: "R"; a: number; b: number; r: number; owner: string; role: string }
  | { kind: "V"; p: number; n: number; v: number; owner: string; role: string }
  | { kind: "I"; from: number; to: number; i: number; owner: string } // current injected into `to`
  | { kind: "D"; a: number; k: number; vf: number; ron: number; owner: string }
  /** Controlled switch: a–b conducts (ron) when V(cp) − V(cn) > threshold. */
  | { kind: "Q"; a: number; b: number; ron: number; cp: number; cn: number; threshold: number; owner: string; role: string }
  /** Controlled voltage source (comparator output): p − n = von when V(cp) − V(cn) > 0, otherwise 0. */
  | { kind: "VQ"; p: number; n: number; von: number; cp: number; cn: number; owner: string; role: string };

interface Built {
  elems: Elem[];
  nodeCount: number;
  nodeKey: string[];
  groundNodes: Set<number>;
}

const num = (o: SceneObject, k: string, d: number) => {
  const v = o.props[k];
  return typeof v === "number" && Number.isFinite(v) ? v : d;
};
const bool = (o: SceneObject, k: string, d: boolean) => {
  const v = o.props[k];
  return typeof v === "boolean" ? v : d;
};
const str = (o: SceneObject, k: string, d: string) => {
  const v = o.props[k];
  return typeof v === "string" ? v : d;
};

export function effectiveModel(o: SceneObject): string | null {
  const def = getComponentDef(o.type);
  if (!def) return null;
  if (def.simulation.model === "multimeter") return str(o, "mode", "voltmeter");
  return def.simulation.model;
}

class UnionFind {
  p: number[];
  constructor(n: number) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.p[x] !== x) {
      this.p[x] = this.p[this.p[x]!]!;
      x = this.p[x]!;
    }
    return x;
  }
  union(a: number, b: number) {
    this.p[this.find(a)] = this.find(b);
  }
}

interface BuildOptions {
  zeroSources?: boolean;
  blown: Set<string>;
  ohmmeterUnderTest?: string;
}

function build(doc: SceneDocument, opts: BuildOptions): Built {
  const nodeIndex = new Map<string, number>();
  const nodeKey: string[] = [];
  const node = (key: string) => {
    let i = nodeIndex.get(key);
    if (i === undefined) {
      i = nodeKey.length;
      nodeIndex.set(key, i);
      nodeKey.push(key);
    }
    return i;
  };
  const elems: Elem[] = [];
  const groundNodes = new Set<number>();
  const R = (a: number, b: number, r: number, owner: string, role = "main") =>
    elems.push({ kind: "R", a, b, r: Math.max(r, 1e-6), owner, role });

  for (const o of doc.objects) {
    const def = getComponentDef(o.type);
    if (!def || def.lab !== "physics" || def.terminals.length === 0) continue;
    const T = (tid: string) => node(`${o.id}:${tid}`);
    // Register all terminals so they have voltages.
    for (const t of def.terminals) T(t.id);
    const model = effectiveModel(o);
    switch (model) {
      case "battery": {
        const x = node(`${o.id}:__int`);
        elems.push({ kind: "V", p: x, n: T("neg"), v: opts.zeroSources ? 0 : num(o, "voltage", 9), owner: o.id, role: "emf" });
        R(x, T("pos"), num(o, "internalResistance", 0.5), o.id, "internal");
        break;
      }
      case "generator": {
        // Linear dynamo: EMF proportional to crank speed, 1 Ω internal resistance.
        const x = node(`${o.id}:__int`);
        elems.push({ kind: "V", p: x, n: T("neg"), v: opts.zeroSources ? 0 : 0.02 * num(o, "rpm", 300), owner: o.id, role: "emf" });
        R(x, T("pos"), 1, o.id, "internal");
        break;
      }
      case "ac-source": {
        // RMS-equivalent source (exact for resistive loads).
        const x = node(`${o.id}:__int`);
        elems.push({ kind: "V", p: x, n: T("b"), v: opts.zeroSources ? 0 : num(o, "amplitude", 5) / Math.SQRT2, owner: o.id, role: "emf" });
        R(x, T("a"), 0.1, o.id, "internal");
        break;
      }
      case "zener":
        elems.push({ kind: "D", a: T("anode"), k: T("cathode"), vf: 0.7, ron: 1, owner: o.id });
        elems.push({ kind: "D", a: T("cathode"), k: T("anode"), vf: num(o, "vz", 5.1), ron: 1, owner: o.id });
        break;
      case "npn":
        elems.push({ kind: "D", a: T("b"), k: T("e"), vf: 0.7, ron: 50, owner: o.id });
        elems.push({ kind: "Q", a: T("c"), b: T("e"), ron: 2, cp: T("b"), cn: T("e"), threshold: 0.7 + 1e-4 * 50, owner: o.id, role: "ce" });
        break;
      case "nmos":
        elems.push({ kind: "Q", a: T("d"), b: T("s"), ron: 0.5, cp: T("g"), cn: T("s"), threshold: num(o, "vth", 2), owner: o.id, role: "ds" });
        break;
      case "comparator": {
        const x = node(`${o.id}:__int`);
        elems.push({ kind: "VQ", p: x, n: T("inn"), von: 5, cp: T("inp"), cn: T("inn"), owner: o.id, role: "out" });
        R(x, T("out"), 100, o.id, "rout");
        break;
      }
      case "relay": {
        const rc = num(o, "coilResistance", 100);
        R(T("c1"), T("c2"), rc, o.id, "coil");
        elems.push({ kind: "Q", a: T("s1"), b: T("s2"), ron: 0.01, cp: T("c1"), cn: T("c2"), threshold: 0.03 * rc, owner: o.id, role: "contact" });
        // Coil polarity does not matter: add the reverse-polarity control too.
        elems.push({ kind: "Q", a: T("s1"), b: T("s2"), ron: 0.01, cp: T("c2"), cn: T("c1"), threshold: 0.03 * rc, owner: o.id, role: "contact-r" });
        break;
      }
      case "wattmeter":
        R(T("ip"), T("in"), AMMETER_RESISTANCE, o.id, "icoil");
        R(T("vp"), T("vn"), VOLTMETER_RESISTANCE, o.id, "vcoil");
        break;
      case "oscilloscope":
        R(T("pos"), T("neg"), VOLTMETER_RESISTANCE, o.id);
        break;
      case "resistor":
        R(T("a"), T("b"), num(o, "resistance", 100), o.id);
        break;
      case "rheostat":
        R(T("a"), T("b"), Math.max(0.01, (num(o, "maxResistance", 50) * num(o, "position", 50)) / 100), o.id);
        break;
      case "potentiometer": {
        const total = num(o, "resistance", 10000);
        const pos = Math.min(1, Math.max(0, num(o, "position", 50) / 100));
        R(T("a"), T("w"), Math.max(1e-3, total * pos), o.id, "aw");
        R(T("w"), T("b"), Math.max(1e-3, total * (1 - pos)), o.id, "wb");
        break;
      }
      case "capacitor-dc":
        break; // open circuit in DC steady state
      case "inductor-dc":
        R(T("a"), T("b"), num(o, "resistance", 1), o.id);
        break;
      case "thermistor": {
        const tK = num(o, "temperature", 25) + 273.15;
        const r = num(o, "r25", 10000) * Math.exp(num(o, "beta", 3950) * (1 / tK - 1 / 298.15));
        R(T("a"), T("b"), r, o.id);
        break;
      }
      case "ldr":
        R(T("a"), T("b"), 1e4 * Math.pow(10 / Math.max(1, num(o, "lux", 100)), 0.7), o.id);
        break;
      case "switch":
        if (bool(o, "closed", false)) R(T("a"), T("b"), SWITCH_CLOSED_RESISTANCE, o.id);
        break;
      case "fuse":
        if (!bool(o, "blown", false) && !opts.blown.has(o.id)) R(T("a"), T("b"), 0.01, o.id);
        break;
      case "diode":
        elems.push({ kind: "D", a: T("anode"), k: T("cathode"), vf: num(o, "vf", 0.7), ron: 1, owner: o.id });
        break;
      case "led":
        elems.push({ kind: "D", a: T("anode"), k: T("cathode"), vf: LED_VF[str(o, "color", "red")] ?? 1.8, ron: 10, owner: o.id });
        break;
      case "bulb": {
        const v = num(o, "ratedVoltage", 6);
        const p = Math.max(1e-3, num(o, "ratedPower", 3));
        R(T("a"), T("b"), (v * v) / p, o.id);
        break;
      }
      case "load":
      case "electromagnet":
        R(T("a"), T("b"), num(o, "resistance", 10), o.id);
        break;
      case "material":
        R(T("a"), T("b"), MATERIAL_RESISTANCE[str(o, "material", "copper")]?.r ?? 1e12, o.id);
        break;
      case "ammeter":
        R(T("neg"), T("pos"), AMMETER_RESISTANCE, o.id);
        break;
      case "voltmeter":
        R(T("pos"), T("neg"), VOLTMETER_RESISTANCE, o.id);
        break;
      case "ohmmeter":
        if (opts.ohmmeterUnderTest === o.id) {
          elems.push({ kind: "I", from: T("neg"), to: T("pos"), i: OHMMETER_TEST_CURRENT, owner: o.id });
          groundNodes.add(T("neg"));
        }
        break;
      case "junction":
        R(T("t1"), T("t2"), 1e-4, o.id);
        R(T("t2"), T("t3"), 1e-4, o.id);
        break;
      case "ground":
        if (!opts.ohmmeterUnderTest) groundNodes.add(T("g"));
        break;
      default:
        break; // unsupported: open
    }
  }

  for (const w of doc.wires) {
    const a = nodeIndex.get(`${w.from.objectId}:${w.from.terminalId}`);
    const b = nodeIndex.get(`${w.to.objectId}:${w.to.terminalId}`);
    if (a === undefined || b === undefined) continue;
    elems.push({ kind: "R", a, b, r: WIRE_RESISTANCE, owner: w.id, role: "wire" });
  }

  return { elems, nodeCount: nodeKey.length, nodeKey, groundNodes };
}

interface Solved {
  ok: boolean;
  v: Float64Array; // node voltages
  vsCurrent: Map<Elem, number>;
  diodeOn: Map<Elem, boolean>;
  ctrlOn: Map<Elem, boolean>;
  iterations: number;
  converged: boolean;
}

function solveBuilt(b: Built): Solved {
  const { elems, nodeCount } = b;
  // Choose a reference node for every connected group.
  const uf = new UnionFind(nodeCount);
  for (const e of elems) {
    if (e.kind === "R") uf.union(e.a, e.b);
    else if (e.kind === "V") uf.union(e.p, e.n);
    else if (e.kind === "D") uf.union(e.a, e.k);
    else if (e.kind === "Q") uf.union(e.a, e.b);
    else if (e.kind === "VQ") uf.union(e.p, e.n);
    else uf.union(e.from, e.to);
  }
  const refOfGroup = new Map<number, number>();
  for (const g of b.groundNodes) if (!refOfGroup.has(uf.find(g))) refOfGroup.set(uf.find(g), g);
  for (const e of elems) if (e.kind === "V" && !refOfGroup.has(uf.find(e.n))) refOfGroup.set(uf.find(e.n), e.n);
  for (let i = 0; i < nodeCount; i++) if (!refOfGroup.has(uf.find(i))) refOfGroup.set(uf.find(i), i);
  const isRef = new Set<number>();
  for (const g of b.groundNodes) isRef.add(g);
  for (const r of refOfGroup.values()) isRef.add(r);

  // Map non-reference nodes to matrix indices.
  const idx = new Int32Array(nodeCount).fill(-1);
  let n = 0;
  for (let i = 0; i < nodeCount; i++) if (!isRef.has(i)) idx[i] = n++;
  const vsrcs = elems.filter((e) => e.kind === "V" || e.kind === "VQ");
  const size = n + vsrcs.length;

  const diodes = elems.filter((e): e is Extract<Elem, { kind: "D" }> => e.kind === "D");
  const diodeOn = new Map<Elem, boolean>(diodes.map((d) => [d, false]));

  let last: { x: Float64Array } | null = null;
  let iterations = 0;
  const ctrls = elems.filter((e): e is Extract<Elem, { kind: "Q" | "VQ" }> => e.kind === "Q" || e.kind === "VQ");
  const ctrlOn = new Map<Elem, boolean>(ctrls.map((c) => [c, false]));
  const nonlinear = diodes.length + ctrls.length;
  let converged = nonlinear === 0;
  const maxIter = nonlinear === 0 ? 1 : 60;

  for (let iter = 0; iter < maxIter; iter++) {
    iterations++;
    const A = Array.from({ length: size }, () => new Float64Array(size));
    const z = new Float64Array(size);
    const stampG = (a: number, c: number, g: number) => {
      const ia = idx[a]!;
      const ic = idx[c]!;
      if (ia >= 0) A[ia]![ia]! += g;
      if (ic >= 0) A[ic]![ic]! += g;
      if (ia >= 0 && ic >= 0) {
        A[ia]![ic]! -= g;
        A[ic]![ia]! -= g;
      }
    };
    const inject = (node: number, i: number) => {
      const ix = idx[node]!;
      if (ix >= 0) z[ix]! += i;
    };
    for (let i = 0; i < n; i++) A[i]![i]! += GMIN;
    let k = 0;
    for (const e of elems) {
      if (e.kind === "R") stampG(e.a, e.b, 1 / e.r);
      else if (e.kind === "I") {
        inject(e.to, e.i);
        inject(e.from, -e.i);
      } else if (e.kind === "D") {
        if (diodeOn.get(e)) {
          const g = 1 / e.ron;
          stampG(e.a, e.k, g);
          inject(e.a, e.vf * g);
          inject(e.k, -e.vf * g);
        } else stampG(e.a, e.k, DIODE_OFF_G);
      } else if (e.kind === "Q") stampG(e.a, e.b, ctrlOn.get(e) ? 1 / e.ron : DIODE_OFF_G);
    }
    for (const e of vsrcs) {
      if (e.kind !== "V" && e.kind !== "VQ") continue;
      const row = n + k++;
      const ip = idx[e.p]!;
      const inn = idx[e.n]!;
      if (ip >= 0) {
        A[ip]![row]! += 1;
        A[row]![ip]! += 1;
      }
      if (inn >= 0) {
        A[inn]![row]! -= 1;
        A[row]![inn]! -= 1;
      }
      z[row] = e.kind === "V" ? e.v : ctrlOn.get(e) ? e.von : 0;
    }
    const out = solveDense(A, z);
    if (!out.ok) return { ok: false, v: new Float64Array(nodeCount), vsCurrent: new Map(), diodeOn, ctrlOn, iterations, converged: false };
    last = { x: out.x };
    if (nonlinear === 0) break;
    // Update diode and controlled-switch states.
    let changed = false;
    const volt = (node: number) => (idx[node]! >= 0 ? out.x[idx[node]!]! : 0);
    for (const c of ctrls) {
      const ctl = volt(c.cp) - volt(c.cn);
      const want = c.kind === "Q" ? ctl > c.threshold : ctl > 0;
      if (want !== ctrlOn.get(c)) {
        ctrlOn.set(c, want);
        changed = true;
      }
    }
    for (const d of diodes) {
      const vd = volt(d.a) - volt(d.k);
      const on = diodeOn.get(d)!;
      if (!on && vd > d.vf + 1e-9) {
        diodeOn.set(d, true);
        changed = true;
      } else if (on && (vd - d.vf) / d.ron < -1e-12) {
        diodeOn.set(d, false);
        changed = true;
      }
    }
    if (!changed) {
      converged = true;
      break;
    }
  }

  const x = last!.x;
  const v = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) v[i] = idx[i]! >= 0 ? x[idx[i]!]! : 0;
  const vsCurrent = new Map<Elem, number>();
  vsrcs.forEach((e, j) => vsCurrent.set(e, x[n + j]!));
  return { ok: true, v, vsCurrent, diodeOn, ctrlOn, iterations, converged };
}

/* ------------------------------------------------------------------ */

export function simulateCircuit(doc: SceneDocument): SimulationResult {
  const issues: Issue[] = [];
  const blown = new Set<string>();
  const objects = doc.objects.filter((o) => getComponentDef(o.type)?.lab === "physics");

  // Connectivity diagnostics.
  const wiredTerminals = new Set<string>();
  for (const w of doc.wires) {
    wiredTerminals.add(`${w.from.objectId}:${w.from.terminalId}`);
    wiredTerminals.add(`${w.to.objectId}:${w.to.terminalId}`);
  }
  for (const o of objects) {
    const def = getComponentDef(o.type)!;
    if (def.terminals.length === 0 || def.simulation.model === "ground") continue;
    const wired = def.terminals.filter((t) => wiredTerminals.has(`${o.id}:${t.id}`)).length;
    if (def.simulation.support === "not-simulated" && wired > 0)
      issues.push({ code: "unsupported-component", severity: "warning", componentIds: [o.id], params: { type: o.type } });
    else if (wired === 0) issues.push({ code: "disconnected", severity: "info", componentIds: [o.id] });
    else if (wired < def.terminals.length && def.simulation.model !== "junction" && def.simulation.model !== "potentiometer")
      issues.push({ code: "partially-connected", severity: "warning", componentIds: [o.id] });
  }

  // Main solve, re-running while fuses blow.
  let built = build(doc, { blown });
  let solved = solveBuilt(built);
  for (let pass = 0; pass < 10 && solved.ok; pass++) {
    let newlyBlown = false;
    for (const e of built.elems) {
      if (e.kind !== "R" || e.role !== "main") continue;
      const o = objects.find((x) => x.id === e.owner);
      if (!o || effectiveModel(o) !== "fuse") continue;
      const i = Math.abs((solved.v[e.a]! - solved.v[e.b]!) / e.r);
      if (i > num(o, "rating", 1)) {
        blown.add(o.id);
        newlyBlown = true;
      }
    }
    if (!newlyBlown) break;
    built = build(doc, { blown });
    solved = solveBuilt(built);
  }

  const result: SimulationResult = {
    ok: solved.ok,
    nodeVoltages: {},
    components: {},
    wires: {},
    issues,
    closedCircuit: false,
    blownFuses: [...blown],
    iterations: solved.iterations,
  };
  if (!solved.ok) {
    issues.push({ code: "singular", severity: "error", componentIds: [] });
    return result;
  }
  if (!solved.converged) issues.push({ code: "non-convergence", severity: "warning", componentIds: [] });

  const V = (key: string) => {
    const i = built.nodeKey.indexOf(key);
    return i >= 0 ? solved.v[i]! : 0;
  };
  built.nodeKey.forEach((k, i) => {
    if (!k.endsWith(":__int")) result.nodeVoltages[k] = solved.v[i]!;
  });

  // Wires.
  for (const e of built.elems) {
    if (e.kind === "R" && e.role === "wire") {
      const i = (solved.v[e.a]! - solved.v[e.b]!) / e.r;
      result.wires[e.owner] = { current: i, conducting: Math.abs(i) > CONDUCTING_THRESHOLD };
    }
  }

  const elemsOf = (id: string) => built.elems.filter((e) => e.owner === id);
  let anySource = false;
  let shorted = false;
  let sourceCurrent = 0;

  for (const o of objects) {
    const def = getComponentDef(o.type)!;
    if (def.terminals.length === 0) continue;
    const model = effectiveModel(o);
    const term = (t: string) => V(`${o.id}:${t}`);
    const res: ComponentResult = { current: 0, voltage: 0, power: 0 };
    const mainR = elemsOf(o.id).find((e) => e.kind === "R" && e.role === "main") as Extract<Elem, { kind: "R" }> | undefined;
    const twoTerm = () => {
      res.voltage = term("a") - term("b");
      res.current = mainR ? res.voltage / mainR.r : 0;
      res.power = res.voltage * res.current;
    };

    switch (model) {
      case "ac-source":
      case "generator":
      case "battery": {
        const ac = model === "ac-source";
        const emf = model === "generator" ? 0.02 * num(o, "rpm", 300) : ac ? num(o, "amplitude", 5) / Math.SQRT2 : num(o, "voltage", 9);
        const internal = elemsOf(o.id).find((e) => e.kind === "R" && e.role === "internal") as Extract<Elem, { kind: "R" }>;
        const iDelivered = (solved.v[internal.a]! - solved.v[internal.b]!) / internal.r;
        const [tp, tn] = ac ? ["a", "b"] : ["pos", "neg"];
        res.voltage = term(tp) - term(tn);
        res.current = iDelivered;
        res.power = res.voltage * iDelivered;
        const wired = wiredTerminals.has(`${o.id}:${tp}`) && wiredTerminals.has(`${o.id}:${tn}`);
        if (wired && emf > 0) {
          anySource = true;
          sourceCurrent = Math.max(sourceCurrent, Math.abs(iDelivered));
          const rExternal = Math.abs(iDelivered) > 1e-12 ? res.voltage / iDelivered : Infinity;
          if (Math.abs(iDelivered) > 0.05 && (res.voltage < 0.1 * emf || rExternal < 0.1)) {
            shorted = true;
            issues.push({ code: "short-circuit", severity: "error", componentIds: [o.id], params: { current: round(iDelivered) } });
          }
        }
        break;
      }
      case "resistor":
      case "rheostat":
      case "inductor-dc":
      case "thermistor":
      case "ldr":
      case "material":
        twoTerm();
        break;
      case "potentiometer": {
        const aw = elemsOf(o.id).find((e) => e.kind === "R" && e.role === "aw") as Extract<Elem, { kind: "R" }>;
        res.voltage = term("a") - term("b");
        res.current = (term("a") - term("w")) / aw.r;
        res.power = elemsOf(o.id).reduce((s, e) => (e.kind === "R" ? s + (solved.v[e.a]! - solved.v[e.b]!) ** 2 / e.r : s), 0);
        break;
      }
      case "capacitor-dc":
        res.voltage = term("a") - term("b");
        break;
      case "switch":
        twoTerm();
        res.state = bool(o, "closed", false) ? "closed" : "open";
        break;
      case "fuse":
        twoTerm();
        res.state = blown.has(o.id) || bool(o, "blown", false) ? "blown" : "closed";
        if (blown.has(o.id)) issues.push({ code: "fuse-blown", severity: "warning", componentIds: [o.id], params: { rating: num(o, "rating", 1) } });
        break;
      case "diode":
      case "led": {
        const d = elemsOf(o.id).find((e) => e.kind === "D") as Extract<Elem, { kind: "D" }>;
        const vd = term("anode") - term("cathode");
        const on = solved.diodeOn.get(d) ?? false;
        res.voltage = vd;
        res.current = on ? (vd - d.vf) / d.ron : vd * DIODE_OFF_G;
        res.power = vd * res.current;
        res.state = on ? "on" : "off";
        if (model === "led") {
          const rated = num(o, "ratedCurrent", 20) / 1000;
          res.activity = clamp01(res.current / rated);
          if (res.current > 2.5 * rated)
            issues.push({ code: "led-overcurrent", severity: "warning", componentIds: [o.id], params: { current: round(res.current * 1000) } });
          if (!on && vd < -0.5) issues.push({ code: "led-reverse", severity: "info", componentIds: [o.id] });
        }
        break;
      }
      case "bulb": {
        twoTerm();
        const rated = num(o, "ratedPower", 3);
        res.activity = clamp01(res.power / rated);
        res.state = res.power > rated * 0.02 ? "on" : "off";
        if (res.power > rated * 1.5) issues.push({ code: "bulb-overvoltage", severity: "warning", componentIds: [o.id] });
        break;
      }
      case "load":
        twoTerm();
        res.activity = clamp01(res.power / num(o, "ratedPower", 1));
        res.state = res.activity > 0.05 ? "on" : "off";
        break;
      case "electromagnet": {
        twoTerm();
        const mu = 4 * Math.PI * 1e-7 * (bool(o, "ironCore", true) ? 200 : 1);
        res.fieldT = (mu * num(o, "turns", 200) * Math.abs(res.current)) / 0.05;
        res.activity = clamp01(res.fieldT / 0.5);
        break;
      }
      case "ammeter":
        res.voltage = term("pos") - term("neg");
        res.current = (term("neg") - term("pos")) / AMMETER_RESISTANCE; // conventional current entering + terminal
        res.current = -res.current;
        res.reading = res.current;
        res.readingUnit = "A";
        res.power = res.voltage * res.current;
        break;
      case "voltmeter":
        res.voltage = term("pos") - term("neg");
        res.current = res.voltage / VOLTMETER_RESISTANCE;
        res.reading = res.voltage;
        res.readingUnit = "V";
        break;
      case "ohmmeter": {
        res.readingUnit = "Ω";
        const live = Math.abs(term("pos") - term("neg"));
        if (live > 1e-3) {
          issues.push({ code: "ohmmeter-live", severity: "warning", componentIds: [o.id] });
          res.reading = null;
          break;
        }
        const tb = build(doc, { zeroSources: true, blown, ohmmeterUnderTest: o.id });
        const ts = solveBuilt(tb);
        if (!ts.ok) {
          res.reading = null;
          break;
        }
        const vp = ts.v[tb.nodeKey.indexOf(`${o.id}:pos`)]!;
        const vn = ts.v[tb.nodeKey.indexOf(`${o.id}:neg`)]!;
        const r = (vp - vn) / OHMMETER_TEST_CURRENT;
        res.reading = r > OHMMETER_OVERLOAD ? null : r;
        break;
      }
      case "junction":
        res.voltage = 0;
        break;
      case "zener": {
        const ds = elemsOf(o.id).filter((e) => e.kind === "D") as Extract<Elem, { kind: "D" }>[];
        const vd = term("anode") - term("cathode");
        const fwd = solved.diodeOn.get(ds[0]!) ?? false;
        const rev = solved.diodeOn.get(ds[1]!) ?? false;
        res.voltage = vd;
        res.current = fwd ? (vd - ds[0]!.vf) / ds[0]!.ron : rev ? -(-vd - ds[1]!.vf) / ds[1]!.ron : 0;
        res.power = vd * res.current;
        res.state = fwd || rev ? "on" : "off";
        break;
      }
      case "npn":
      case "nmos": {
        const sw = elemsOf(o.id).find((e) => e.kind === "Q") as Extract<Elem, { kind: "Q" }>;
        const on = solved.ctrlOn.get(sw) ?? false;
        const [hi, lo] = model === "npn" ? ["c", "e"] : ["d", "s"];
        res.voltage = term(hi) - term(lo);
        res.current = on ? res.voltage / sw.ron : res.voltage * DIODE_OFF_G;
        res.power = res.voltage * res.current;
        res.state = on ? "on" : "off";
        break;
      }
      case "comparator": {
        const vq = elemsOf(o.id).find((e) => e.kind === "VQ")!;
        const on = solved.ctrlOn.get(vq) ?? false;
        res.voltage = term("out") - term("inn");
        res.current = solved.vsCurrent.get(vq) ?? 0;
        res.reading = res.voltage;
        res.readingUnit = "V";
        res.state = on ? "on" : "off";
        break;
      }
      case "relay": {
        const contacts = elemsOf(o.id).filter((e) => e.kind === "Q");
        const on = contacts.some((c) => solved.ctrlOn.get(c));
        const coil = elemsOf(o.id).find((e) => e.kind === "R" && e.role === "coil") as Extract<Elem, { kind: "R" }>;
        res.voltage = term("c1") - term("c2");
        res.current = res.voltage / coil.r;
        res.power = res.voltage * res.current;
        res.state = on ? "closed" : "open";
        res.activity = on ? 1 : 0;
        break;
      }
      case "wattmeter": {
        const i = (term("ip") - term("in")) / AMMETER_RESISTANCE;
        const v = term("vp") - term("vn");
        res.current = i;
        res.voltage = v;
        res.reading = v * i;
        res.readingUnit = "W";
        break;
      }
      case "oscilloscope": {
        res.voltage = term("pos") - term("neg");
        res.current = res.voltage / VOLTMETER_RESISTANCE;
        res.reading = res.voltage;
        res.readingUnit = "V";
        // AC sources make the trace a sine wave; record the peak for the display.
        const acPresent = objects.some((x) => effectiveModel(x) === "ac-source" && wiredTerminals.has(`${x.id}:a`));
        if (acPresent) {
          res.state = "on";
          res.activity = Math.min(1, Math.abs(res.voltage) / 20);
        }
        break;
      }
      default:
        break;
    }
    result.components[o.id] = res;
  }

  const hasPoweredSource = objects.some(
    (o) =>
      (effectiveModel(o) === "battery" && num(o, "voltage", 9) > 0) ||
      (effectiveModel(o) === "generator" && num(o, "rpm", 300) > 0) ||
      (effectiveModel(o) === "ac-source" && num(o, "amplitude", 5) > 0),
  );
  const hasLoads = doc.wires.length > 0;
  if (!hasPoweredSource && hasLoads) issues.push({ code: "no-source", severity: "info", componentIds: [] });
  if (anySource && !shorted && sourceCurrent <= CONDUCTING_THRESHOLD)
    issues.push({ code: "open-circuit", severity: "info", componentIds: [] });

  result.closedCircuit = anySource && !shorted && sourceCurrent > CONDUCTING_THRESHOLD;
  return result;
}

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}
function round(x: number) {
  return Math.round(x * 1000) / 1000;
}
