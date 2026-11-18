/**
 * Ion-level chemistry used to give EVERY combination of substances a defined outcome.
 * Sources: standard school solubility rules and the metal reactivity (activity) series.
 */

export type Bi = { en: string; ar: string };

export interface Cation {
  id: string;
  formula: string; // formula fragment, e.g. "Na", "NH4", "Fe"
  poly: boolean;
  charge: number;
  name: Bi; // e.g. "sodium" / "الصوديوم"
  color: string | null; // colour of the aqueous ion (null = colourless)
  group1: boolean; // group 1 or ammonium (always soluble salts)
}

export interface Anion {
  id: string;
  formula: string;
  poly: boolean;
  charge: number;
  name: Bi; // "chloride" / "كلوريد"
}

const b = (en: string, ar: string): Bi => ({ en, ar });

export const CATIONS: Record<string, Cation> = {
  H: { id: "H", formula: "H", poly: false, charge: 1, name: b("hydrogen", "الهيدروجين"), color: null, group1: false },
  Li: { id: "Li", formula: "Li", poly: false, charge: 1, name: b("lithium", "الليثيوم"), color: null, group1: true },
  Na: { id: "Na", formula: "Na", poly: false, charge: 1, name: b("sodium", "الصوديوم"), color: null, group1: true },
  K: { id: "K", formula: "K", poly: false, charge: 1, name: b("potassium", "البوتاسيوم"), color: null, group1: true },
  NH4: { id: "NH4", formula: "NH4", poly: true, charge: 1, name: b("ammonium", "الأمونيوم"), color: null, group1: true },
  Ag: { id: "Ag", formula: "Ag", poly: false, charge: 1, name: b("silver", "الفضة"), color: null, group1: false },
  Mg: { id: "Mg", formula: "Mg", poly: false, charge: 2, name: b("magnesium", "الماغنسيوم"), color: null, group1: false },
  Ca: { id: "Ca", formula: "Ca", poly: false, charge: 2, name: b("calcium", "الكالسيوم"), color: null, group1: false },
  Ba: { id: "Ba", formula: "Ba", poly: false, charge: 2, name: b("barium", "الباريوم"), color: null, group1: false },
  Zn: { id: "Zn", formula: "Zn", poly: false, charge: 2, name: b("zinc", "الخارصين"), color: null, group1: false },
  Fe2: { id: "Fe2", formula: "Fe", poly: false, charge: 2, name: b("iron(II)", "الحديد (II)"), color: "#bfe3b4", group1: false },
  Fe3: { id: "Fe3", formula: "Fe", poly: false, charge: 3, name: b("iron(III)", "الحديد (III)"), color: "#d6a13a", group1: false },
  Cu: { id: "Cu", formula: "Cu", poly: false, charge: 2, name: b("copper(II)", "النحاس (II)"), color: "#1e88e5", group1: false },
  Pb: { id: "Pb", formula: "Pb", poly: false, charge: 2, name: b("lead(II)", "الرصاص (II)"), color: null, group1: false },
  Al: { id: "Al", formula: "Al", poly: false, charge: 3, name: b("aluminium", "الألومنيوم"), color: null, group1: false },
  Hg: { id: "Hg", formula: "Hg", poly: false, charge: 2, name: b("mercury(II)", "الزئبق (II)"), color: null, group1: false },
  Ni: { id: "Ni", formula: "Ni", poly: false, charge: 2, name: b("nickel(II)", "النيكل (II)"), color: "#4caf50", group1: false },
  Sn: { id: "Sn", formula: "Sn", poly: false, charge: 2, name: b("tin(II)", "القصدير (II)"), color: null, group1: false },
};

export const ANIONS: Record<string, Anion> = {
  OH: { id: "OH", formula: "OH", poly: true, charge: 1, name: b("hydroxide", "هيدروكسيد") },
  Cl: { id: "Cl", formula: "Cl", poly: false, charge: 1, name: b("chloride", "كلوريد") },
  Br: { id: "Br", formula: "Br", poly: false, charge: 1, name: b("bromide", "بروميد") },
  I: { id: "I", formula: "I", poly: false, charge: 1, name: b("iodide", "يوديد") },
  F: { id: "F", formula: "F", poly: false, charge: 1, name: b("fluoride", "فلوريد") },
  NO3: { id: "NO3", formula: "NO3", poly: true, charge: 1, name: b("nitrate", "نترات") },
  CH3COO: { id: "CH3COO", formula: "CH3COO", poly: true, charge: 1, name: b("acetate", "أسيتات") },
  HCO3: { id: "HCO3", formula: "HCO3", poly: true, charge: 1, name: b("hydrogen carbonate", "بيكربونات") },
  SO4: { id: "SO4", formula: "SO4", poly: true, charge: 2, name: b("sulfate", "كبريتات") },
  CO3: { id: "CO3", formula: "CO3", poly: true, charge: 2, name: b("carbonate", "كربونات") },
  S: { id: "S", formula: "S", poly: false, charge: 2, name: b("sulfide", "كبريتيد") },
  PO4: { id: "PO4", formula: "PO4", poly: true, charge: 3, name: b("phosphate", "فوسفات") },
};

/** Metals in order of decreasing reactivity; "H" marks hydrogen's position. */
export const ACTIVITY = ["K", "Na", "Li", "Ca", "Mg", "Al", "Zn", "Fe", "Ni", "Sn", "Pb", "H", "Cu", "Hg", "Ag", "Au"] as const;

/** Metal element → ion it forms in single-displacement / acid reactions. */
export const METAL_ION: Record<string, string> = { K: "K", Na: "Na", Li: "Li", Ca: "Ca", Mg: "Mg", Al: "Al", Zn: "Zn", Fe: "Fe2", Ni: "Ni", Sn: "Sn", Pb: "Pb", Cu: "Cu", Hg: "Hg", Ag: "Ag" };
export const ION_METAL: Record<string, string> = { K: "K", Na: "Na", Li: "Li", Ca: "Ca", Mg: "Mg", Al: "Al", Zn: "Zn", Fe2: "Fe", Fe3: "Fe", Ni: "Ni", Sn: "Sn", Pb: "Pb", Cu: "Cu", Hg: "Hg", Ag: "Ag" };

export const rank = (metal: string) => ACTIVITY.indexOf(metal as (typeof ACTIVITY)[number]);
export const aboveHydrogen = (metal: string) => rank(metal) >= 0 && rank(metal) < rank("H");
/** Metals that react with cold water (K, Na, Li, Ca). */
export const reactsWithColdWater = (metal: string) => ["K", "Na", "Li", "Ca"].includes(metal);

/* ------------------------------ solubility ------------------------------ */

export interface Solubility {
  soluble: boolean;
  slight?: boolean;
  color: string; // colour of the solid
}

const PPT_COLOR: Record<string, string> = {
  "Ag-Cl": "#f5f5f0", "Ag-Br": "#efe6b8", "Ag-I": "#f2dc6b", "Ag-OH": "#5b3a1e", "Ag-CO3": "#f1e7b8", "Ag-PO4": "#f2d64b", "Ag-S": "#141414", "Ag-SO4": "#f5f5f0",
  "Pb-I": "#f5d000", "Pb-Cl": "#f5f5f0", "Pb-Br": "#f5f5f0", "Pb-SO4": "#f5f5f0", "Pb-OH": "#f5f5f0", "Pb-CO3": "#f5f5f0", "Pb-S": "#141414", "Pb-F": "#f5f5f0",
  "Hg-I": "#e4572e", "Hg-S": "#141414", "Hg-OH": "#e8b321", "Hg-CO3": "#d9b26b",
  "Cu-OH": "#4fa3e0", "Cu-CO3": "#3fa67a", "Cu-S": "#141414", "Cu-PO4": "#5aa7c7",
  "Fe2-OH": "#5c7a3c", "Fe2-S": "#1e1e1e", "Fe2-CO3": "#9ca58a",
  "Fe3-OH": "#8a4b1f", "Fe3-PO4": "#e9d9a8",
  "Ni-OH": "#5fa65a", "Ni-CO3": "#8fc28a", "Ni-S": "#1a1a1a",
  "Ba-SO4": "#fbfbf8", "Ba-CO3": "#fbfbf8", "Ca-CO3": "#ecebe6", "Ca-SO4": "#f5f5f2", "Ca-PO4": "#f5f5f2", "Ca-F": "#f5f5f2", "Ca-OH": "#f5f5f2",
  "Mg-OH": "#f5f5f2", "Mg-CO3": "#f5f5f2", "Mg-F": "#f5f5f2", "Zn-S": "#f5f5f2",
};

/** Standard solubility rules (25 °C, school level). */
export function solubility(cat: string, an: string): Solubility {
  const c = CATIONS[cat]!;
  const color = PPT_COLOR[`${cat}-${an}`] ?? "#f4f4f2";
  if (cat === "H") return { soluble: true, color };
  if (c.group1) return { soluble: true, color };
  if (an === "NO3" || an === "CH3COO" || an === "HCO3") return { soluble: true, color };
  if (an === "Cl" || an === "Br") return { soluble: !(cat === "Ag" || cat === "Pb"), color };
  if (an === "I") return { soluble: !(cat === "Ag" || cat === "Pb" || cat === "Hg"), color };
  if (an === "F") return { soluble: !["Ca", "Mg", "Ba", "Pb"].includes(cat), color };
  if (an === "SO4") {
    if (cat === "Ba" || cat === "Pb") return { soluble: false, color };
    if (cat === "Ca" || cat === "Ag") return { soluble: false, slight: true, color };
    return { soluble: true, color };
  }
  if (an === "OH") {
    if (cat === "Ba") return { soluble: true, color };
    if (cat === "Ca") return { soluble: false, slight: true, color };
    return { soluble: false, color };
  }
  // carbonate, phosphate, sulfide: insoluble except group 1 / ammonium
  return { soluble: false, color };
}

/* ------------------------------ formulas & names ------------------------------ */

function gcd(a: number, b2: number): number {
  return b2 === 0 ? a : gcd(b2, a % b2);
}

export function ionicCounts(cat: string, an: string) {
  const c = CATIONS[cat]!.charge;
  const a = ANIONS[an]!.charge;
  const g = gcd(c, a);
  return { nCat: a / g, nAn: c / g };
}

const part = (f: string, poly: boolean, n: number) => (n === 1 ? f : poly ? `(${f})${n}` : `${f}${n}`);

export function ionicFormula(cat: string, an: string): string {
  if (cat === "H" && an === "CH3COO") return "CH3COOH";
  if (cat === "NH4" && an === "OH") return "NH4OH";
  const { nCat, nAn } = ionicCounts(cat, an);
  const C = CATIONS[cat]!;
  const A = ANIONS[an]!;
  if (an === "CH3COO") return `${part(C.formula, C.poly, nCat)}${part("CH3COO", true, nAn)}`;
  return `${part(C.formula, C.poly, nCat)}${part(A.formula, A.poly, nAn)}`;
}

export function ionicName(cat: string, an: string): Bi {
  const C = CATIONS[cat]!;
  const A = ANIONS[an]!;
  if (cat === "H") {
    const acid: Record<string, Bi> = {
      Cl: b("Hydrochloric acid", "حمض الهيدروكلوريك"), SO4: b("Sulfuric acid", "حمض الكبريتيك"), NO3: b("Nitric acid", "حمض النيتريك"),
      CH3COO: b("Acetic acid", "حمض الأسيتيك"), CO3: b("Carbonic acid", "حمض الكربونيك"), PO4: b("Phosphoric acid", "حمض الفوسفوريك"),
      Br: b("Hydrobromic acid", "حمض الهيدروبروميك"), I: b("Hydroiodic acid", "حمض الهيدرويوديك"), F: b("Hydrofluoric acid", "حمض الهيدروفلوريك"), S: b("Hydrogen sulfide", "كبريتيد الهيدروجين"),
    };
    return acid[an] ?? b(`Hydrogen ${A.name.en}`, `${A.name.ar} الهيدروجين`);
  }
  const en = C.name.en.charAt(0).toUpperCase() + C.name.en.slice(1);
  return { en: `${en} ${A.name.en}`, ar: `${A.name.ar} ${C.name.ar}` };
}

export function oxideFormula(cat: string): string {
  const c = CATIONS[cat]!.charge;
  const g = gcd(c, 2);
  return `${part(CATIONS[cat]!.formula, false, 2 / g)}${part("O", false, c / g)}`;
}

export function oxideName(cat: string): Bi {
  const C = CATIONS[cat]!;
  const en = C.name.en.charAt(0).toUpperCase() + C.name.en.slice(1);
  return { en: `${en} oxide`, ar: `أكسيد ${C.name.ar}` };
}
