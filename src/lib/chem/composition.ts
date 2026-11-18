/**
 * Ionic composition of every substance, plus on-demand "dynamic" substances
 * (any cation–anion salt, acid, base or metal oxide) so reaction products are always defined.
 */
import { ANIONS, CATIONS, ionicFormula, ionicName, oxideFormula, oxideName, solubility } from "./ions";
import { SUBSTANCES, type Substance } from "./substances";

export type Comp =
  | { kind: "ionic"; cat: string; an: string }
  | { kind: "metal"; el: string }
  | { kind: "oxide"; cat: string }
  | { kind: "water" }
  | { kind: "indicator" }
  | { kind: "inert"; why: "organic" | "gas" | "catalyst" | "nonmetal" | "peroxide" };

const I = (cat: string, an: string): Comp => ({ kind: "ionic", cat, an });

/** Composition of the curated substances. */
export const COMPOSITION: Record<string, Comp> = {
  water: { kind: "water" },
  hcl: I("H", "Cl"), h2so4: I("H", "SO4"), "acetic-acid": I("H", "CH3COO"),
  naoh: I("Na", "OH"), koh: I("K", "OH"), caoh2: I("Ca", "OH"), ammonia: I("NH4", "OH"),
  nacl: I("Na", "Cl"), agno3: I("Ag", "NO3"), agcl: I("Ag", "Cl"), nano3: I("Na", "NO3"),
  cuso4: I("Cu", "SO4"), cuoh2: I("Cu", "OH"), na2so4: I("Na", "SO4"), bacl2: I("Ba", "Cl"), baso4: I("Ba", "SO4"),
  fes: I("Fe2", "S"), feso4: I("Fe2", "SO4"), fecl2: I("Fe2", "Cl"), fecl3: I("Fe3", "Cl"), feoh3: I("Fe3", "OH"),
  znso4: I("Zn", "SO4"), zncl2: I("Zn", "Cl"), mgcl2: I("Mg", "Cl"), cuno32: I("Cu", "NO3"),
  na2co3: I("Na", "CO3"), nahco3: I("Na", "HCO3"), caco3: I("Ca", "CO3"), cacl2: I("Ca", "Cl"), ch3coona: I("Na", "CH3COO"),
  cuco3: I("Cu", "CO3"), pbno32: I("Pb", "NO3"), ki: I("K", "I"), pbi2: I("Pb", "I"), kno3: I("K", "NO3"),
  nh4cl: I("NH4", "Cl"), nabr: I("Na", "Br"), na3po4: I("Na", "PO4"), mgso4: I("Mg", "SO4"), cucl2: I("Cu", "Cl"),
  al2so43: I("Al", "SO4"), niso4: I("Ni", "SO4"), hgcl2: I("Hg", "Cl"), hgs: I("Hg", "S"), hgno32: I("Hg", "NO3"),
  zn: { kind: "metal", el: "Zn" }, mg: { kind: "metal", el: "Mg" }, fe: { kind: "metal", el: "Fe" }, cu: { kind: "metal", el: "Cu" },
  ag: { kind: "metal", el: "Ag" }, na: { kind: "metal", el: "Na" }, k: { kind: "metal", el: "K" }, ca: { kind: "metal", el: "Ca" },
  al: { kind: "metal", el: "Al" }, ni: { kind: "metal", el: "Ni" }, sn: { kind: "metal", el: "Sn" }, hg: { kind: "metal", el: "Hg" }, "steel-wool": { kind: "metal", el: "Fe" }, pb: { kind: "metal", el: "Pb" },
  mgo: { kind: "oxide", cat: "Mg" }, cuo: { kind: "oxide", cat: "Cu" }, fe2o3: { kind: "oxide", cat: "Fe3" }, cao: { kind: "oxide", cat: "Ca" }, zno: { kind: "oxide", cat: "Zn" },
  phenolphthalein: { kind: "indicator" }, "methyl-orange": { kind: "indicator" }, litmus: { kind: "indicator" }, "universal-indicator": { kind: "indicator" },
  ethanol: { kind: "inert", why: "organic" }, glucose: { kind: "inert", why: "organic" },
  h2: { kind: "inert", why: "gas" }, nh3: { kind: "inert", why: "gas" }, co2: { kind: "inert", why: "gas" }, o2: { kind: "inert", why: "gas" },
  mno2: { kind: "inert", why: "catalyst" }, s: { kind: "inert", why: "nonmetal" }, h2o2: { kind: "inert", why: "peroxide" },
};

let ionicIndex: Map<string, string> | null = null;
let oxideIndex: Map<string, string> | null = null;
function indexes() {
  if (!ionicIndex) {
    ionicIndex = new Map();
    oxideIndex = new Map();
    for (const [id, c] of Object.entries(COMPOSITION)) {
      if (c.kind === "ionic" && !ionicIndex.has(`${c.cat}:${c.an}`)) ionicIndex.set(`${c.cat}:${c.an}`, id);
      if (c.kind === "oxide") oxideIndex!.set(c.cat, id);
    }
  }
  return { ionicIndex: ionicIndex!, oxideIndex: oxideIndex! };
}

/** Substance id for a cation–anion combination (curated id when one exists). */
export function ionicId(cat: string, an: string) {
  return indexes().ionicIndex.get(`${cat}:${an}`) ?? `ion:${cat}:${an}`;
}
export function oxideId(cat: string) {
  return indexes().oxideIndex.get(cat) ?? `ox:${cat}`;
}

export function compositionOf(id: string): Comp | undefined {
  const c = COMPOSITION[id];
  if (c) return c;
  const m = id.match(/^ion:([A-Za-z0-9]+):([A-Za-z0-9]+)$/);
  if (m && CATIONS[m[1]!] && ANIONS[m[2]!]) return { kind: "ionic", cat: m[1]!, an: m[2]! };
  const o = id.match(/^ox:([A-Za-z0-9]+)$/);
  if (o && CATIONS[o[1]!]) return { kind: "oxide", cat: o[1]! };
  return undefined;
}

const cache = new Map<string, Substance>();
const SRC = "Generated from ionic composition (solubility rules / activity series); formula and molar mass computed.";

/** Build a substance record on demand for generated reaction products. */
export function dynamicSubstance(id: string): Substance | undefined {
  if (cache.has(id)) return cache.get(id);
  const c = compositionOf(id);
  if (!c || COMPOSITION[id]) return undefined;
  let s: Substance | undefined;
  if (c.kind === "ionic") {
    const sol = solubility(c.cat, c.an);
    const ionColor = CATIONS[c.cat]!.color;
    s = {
      id,
      formula: ionicFormula(c.cat, c.an),
      name: ionicName(c.cat, c.an),
      cls: c.cat === "H" ? "acid" : c.an === "OH" ? "base" : "salt",
      state: sol.soluble ? "aq" : "s",
      color: sol.soluble ? ionColor ?? "#f3f7fa" : sol.color,
      tint: sol.soluble ? (ionColor ? 0.6 : 0) : 1,
      hazards: c.cat === "Hg" || c.cat === "Pb" || c.cat === "Ba" ? ["toxic"] : ["none"],
      source: SRC,
    };
  } else if (c.kind === "oxide") {
    s = { id, formula: oxideFormula(c.cat), name: oxideName(c.cat), cls: "oxide", state: "s", color: "#f0efe9", tint: 1, hazards: ["none"], source: SRC };
  }
  if (s) cache.set(id, s);
  return s;
}

export function allKnownIds() {
  return SUBSTANCES.map((s) => s.id);
}
