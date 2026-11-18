import { molarMass } from "./formula";

export type SubstanceClass =
  | "acid"
  | "base"
  | "salt"
  | "metal"
  | "nonmetal"
  | "oxide"
  | "gas"
  | "solvent"
  | "indicator"
  | "organic"
  | "catalyst";

export type Hazard = "none" | "irritant" | "corrosive" | "toxic" | "oxidiser" | "flammable" | "reactive";

export interface Substance {
  id: string;
  formula: string | null; // null for mixtures such as litmus
  name: { en: string; ar: string };
  cls: SubstanceClass;
  /** State at room temperature as used in the lab. */
  state: "s" | "l" | "g" | "aq";
  /** Display colour (hex). For aq solutions: the colour of a ~0.5 M solution. */
  color: string;
  /** 0 = colourless, 1 = strongly coloured — weights colour mixing. */
  tint: number;
  /** Strong acid: H+ per formula unit. Strong base: OH- per formula unit. */
  strongAcidH?: number;
  strongBaseOH?: number;
  /** Approximate pH of a ~0.1 M solution for salts/weak species (simplified display only). */
  phHint?: number;
  hazards: Hazard[];
  /** Available in the reagent shelf (stock solutions/solids students can add). */
  stock?: { defaultVolumeMl?: number; defaultMassG?: number; concentration?: number };
  virtualOnly?: boolean;
  source: string;
}

const SRC = "Identity & formula: standard chemistry references (verify by name on PubChem). Molar mass computed from IUPAC atomic weights.";

const S = (s: Omit<Substance, "source">): Substance => ({ ...s, source: SRC });

export const SUBSTANCES: Substance[] = [
  S({ id: "water", formula: "H2O", name: { en: "Distilled water", ar: "ماء مقطر" }, cls: "solvent", state: "l", color: "#cfe8ff", tint: 0, hazards: ["none"], stock: { defaultVolumeMl: 50 }, phHint: 7 }),
  S({ id: "hcl", formula: "HCl", name: { en: "Hydrochloric acid (dilute)", ar: "حمض الهيدروكلوريك (مخفف)" }, cls: "acid", state: "aq", color: "#f3f7fa", tint: 0, strongAcidH: 1, hazards: ["corrosive"], stock: { defaultVolumeMl: 20, concentration: 1 } }),
  S({ id: "h2so4", formula: "H2SO4", name: { en: "Sulfuric acid (dilute)", ar: "حمض الكبريتيك (مخفف)" }, cls: "acid", state: "aq", color: "#f3f7fa", tint: 0, strongAcidH: 2, hazards: ["corrosive"], stock: { defaultVolumeMl: 20, concentration: 0.5 } }),
  S({ id: "acetic-acid", formula: "CH3COOH", name: { en: "Acetic acid (vinegar strength)", ar: "حمض الأسيتيك (بتركيز الخل)" }, cls: "acid", state: "aq", color: "#f6f3ea", tint: 0, phHint: 2.9, hazards: ["irritant"], stock: { defaultVolumeMl: 20, concentration: 0.8 } }),
  S({ id: "naoh", formula: "NaOH", name: { en: "Sodium hydroxide solution", ar: "محلول هيدروكسيد الصوديوم" }, cls: "base", state: "aq", color: "#f3f7fa", tint: 0, strongBaseOH: 1, hazards: ["corrosive"], stock: { defaultVolumeMl: 20, concentration: 1 } }),
  S({ id: "nacl", formula: "NaCl", name: { en: "Sodium chloride", ar: "كلوريد الصوديوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, phHint: 7, hazards: ["none"], stock: { defaultVolumeMl: 20, concentration: 0.5 } }),
  S({ id: "agno3", formula: "AgNO3", name: { en: "Silver nitrate solution", ar: "محلول نترات الفضة" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["corrosive", "oxidiser"], stock: { defaultVolumeMl: 10, concentration: 0.1 } }),
  S({ id: "agcl", formula: "AgCl", name: { en: "Silver chloride", ar: "كلوريد الفضة" }, cls: "salt", state: "s", color: "#f5f5f0", tint: 0.9, hazards: ["none"] }),
  S({ id: "nano3", formula: "NaNO3", name: { en: "Sodium nitrate", ar: "نترات الصوديوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["oxidiser"] }),
  S({ id: "cuso4", formula: "CuSO4", name: { en: "Copper(II) sulfate solution", ar: "محلول كبريتات النحاس (II)" }, cls: "salt", state: "aq", color: "#1e88e5", tint: 0.8, phHint: 4, hazards: ["irritant", "toxic"], stock: { defaultVolumeMl: 20, concentration: 0.5 } }),
  S({ id: "cuoh2", formula: "Cu(OH)2", name: { en: "Copper(II) hydroxide", ar: "هيدروكسيد النحاس (II)" }, cls: "base", state: "s", color: "#4fa3e0", tint: 1, hazards: ["irritant"] }),
  S({ id: "na2so4", formula: "Na2SO4", name: { en: "Sodium sulfate", ar: "كبريتات الصوديوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, phHint: 7, hazards: ["none"], stock: { defaultVolumeMl: 20, concentration: 0.5 } }),
  S({ id: "bacl2", formula: "BaCl2", name: { en: "Barium chloride solution", ar: "محلول كلوريد الباريوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["toxic"], stock: { defaultVolumeMl: 10, concentration: 0.1 } }),
  S({ id: "baso4", formula: "BaSO4", name: { en: "Barium sulfate", ar: "كبريتات الباريوم" }, cls: "salt", state: "s", color: "#fbfbf8", tint: 0.9, hazards: ["none"] }),
  S({ id: "zn", formula: "Zn", name: { en: "Zinc granules", ar: "حبيبات الخارصين" }, cls: "metal", state: "s", color: "#a8adb3", tint: 1, hazards: ["none"], stock: { defaultMassG: 1 } }),
  S({ id: "mg", formula: "Mg", name: { en: "Magnesium ribbon", ar: "شريط الماغنسيوم" }, cls: "metal", state: "s", color: "#c9ccd1", tint: 1, hazards: ["flammable"], stock: { defaultMassG: 0.2 } }),
  S({ id: "fe", formula: "Fe", name: { en: "Iron filings", ar: "برادة الحديد" }, cls: "metal", state: "s", color: "#5b5f66", tint: 1, hazards: ["none"], stock: { defaultMassG: 1 } }),
  S({ id: "cu", formula: "Cu", name: { en: "Copper turnings", ar: "خراطة النحاس" }, cls: "metal", state: "s", color: "#b8673a", tint: 1, hazards: ["none"], stock: { defaultMassG: 1 } }),
  S({ id: "ag", formula: "Ag", name: { en: "Silver (deposit)", ar: "فضة (راسب)" }, cls: "metal", state: "s", color: "#c8ccd2", tint: 1, hazards: ["none"] }),
  S({ id: "steel-wool", formula: "Fe", name: { en: "Steel wool (fine iron fibres)", ar: "صوف الصلب (سلك المواعين)" }, cls: "metal", state: "s", color: "#8d9198", tint: 1, hazards: ["flammable"], stock: { defaultMassG: 0.5 } }),
  S({ id: "fe2o3", formula: "Fe2O3", name: { en: "Iron(III) oxide", ar: "أكسيد الحديد (III)" }, cls: "oxide", state: "s", color: "#7a3416", tint: 1, hazards: ["none"] }),
  S({ id: "s", formula: "S", name: { en: "Sulfur powder", ar: "مسحوق الكبريت" }, cls: "nonmetal", state: "s", color: "#e8d33a", tint: 1, hazards: ["flammable"], stock: { defaultMassG: 0.5 } }),
  S({ id: "fes", formula: "FeS", name: { en: "Iron(II) sulfide", ar: "كبريتيد الحديد (II)" }, cls: "salt", state: "s", color: "#2b2b2b", tint: 1, hazards: ["irritant"] }),
  S({ id: "feso4", formula: "FeSO4", name: { en: "Iron(II) sulfate", ar: "كبريتات الحديد (II)" }, cls: "salt", state: "aq", color: "#bfe3b4", tint: 0.35, hazards: ["irritant"] }),
  S({ id: "fecl2", formula: "FeCl2", name: { en: "Iron(II) chloride", ar: "كلوريد الحديد (II)" }, cls: "salt", state: "aq", color: "#c3e6b5", tint: 0.35, hazards: ["irritant"] }),
  S({ id: "fecl3", formula: "FeCl3", name: { en: "Iron(III) chloride solution", ar: "محلول كلوريد الحديد (III)" }, cls: "salt", state: "aq", color: "#d6a13a", tint: 0.7, phHint: 2, hazards: ["corrosive"], stock: { defaultVolumeMl: 10, concentration: 0.2 } }),
  S({ id: "feoh3", formula: "Fe(OH)3", name: { en: "Iron(III) hydroxide", ar: "هيدروكسيد الحديد (III)" }, cls: "base", state: "s", color: "#8a4b1f", tint: 1, hazards: ["none"] }),
  S({ id: "znso4", formula: "ZnSO4", name: { en: "Zinc sulfate", ar: "كبريتات الخارصين" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["irritant"] }),
  S({ id: "zncl2", formula: "ZnCl2", name: { en: "Zinc chloride", ar: "كلوريد الخارصين" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["corrosive"] }),
  S({ id: "mgcl2", formula: "MgCl2", name: { en: "Magnesium chloride", ar: "كلوريد الماغنسيوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["none"] }),
  S({ id: "mgo", formula: "MgO", name: { en: "Magnesium oxide", ar: "أكسيد الماغنسيوم" }, cls: "oxide", state: "s", color: "#f4f4f2", tint: 1, hazards: ["none"] }),
  S({ id: "cuno32", formula: "Cu(NO3)2", name: { en: "Copper(II) nitrate", ar: "نترات النحاس (II)" }, cls: "salt", state: "aq", color: "#3b8fd9", tint: 0.7, hazards: ["oxidiser", "irritant"] }),
  S({ id: "na2co3", formula: "Na2CO3", name: { en: "Sodium carbonate solution", ar: "محلول كربونات الصوديوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, phHint: 11.6, hazards: ["irritant"], stock: { defaultVolumeMl: 20, concentration: 0.5 } }),
  S({ id: "nahco3", formula: "NaHCO3", name: { en: "Sodium hydrogen carbonate (baking soda)", ar: "بيكربونات الصوديوم" }, cls: "salt", state: "s", color: "#fafafa", tint: 1, phHint: 8.3, hazards: ["none"], stock: { defaultMassG: 2 } }),
  S({ id: "caco3", formula: "CaCO3", name: { en: "Calcium carbonate (marble chips)", ar: "كربونات الكالسيوم (رخام)" }, cls: "salt", state: "s", color: "#ecebe6", tint: 1, hazards: ["none"], stock: { defaultMassG: 2 } }),
  S({ id: "cacl2", formula: "CaCl2", name: { en: "Calcium chloride", ar: "كلوريد الكالسيوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["irritant"] }),
  S({ id: "ch3coona", formula: "CH3COONa", name: { en: "Sodium acetate", ar: "أسيتات الصوديوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, phHint: 8.9, hazards: ["none"] }),
  S({ id: "h2o2", formula: "H2O2", name: { en: "Hydrogen peroxide (3–6 %)", ar: "فوق أكسيد الهيدروجين (3–6%)" }, cls: "oxide", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["oxidiser", "irritant"], stock: { defaultVolumeMl: 20, concentration: 1 } }),
  S({ id: "mno2", formula: "MnO2", name: { en: "Manganese(IV) oxide (catalyst)", ar: "ثاني أكسيد المنجنيز (عامل حفاز)" }, cls: "catalyst", state: "s", color: "#1c1c1c", tint: 1, hazards: ["irritant"], stock: { defaultMassG: 0.2 } }),
  S({ id: "cuco3", formula: "CuCO3", name: { en: "Copper(II) carbonate", ar: "كربونات النحاس (II)" }, cls: "salt", state: "s", color: "#3fa67a", tint: 1, hazards: ["irritant"], stock: { defaultMassG: 2 } }),
  S({ id: "cuo", formula: "CuO", name: { en: "Copper(II) oxide", ar: "أكسيد النحاس (II)" }, cls: "oxide", state: "s", color: "#141414", tint: 1, hazards: ["irritant"] }),
  S({ id: "pbno32", formula: "Pb(NO3)2", name: { en: "Lead(II) nitrate solution", ar: "محلول نترات الرصاص (II)" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["toxic", "oxidiser"], virtualOnly: true, stock: { defaultVolumeMl: 10, concentration: 0.1 } }),
  S({ id: "ki", formula: "KI", name: { en: "Potassium iodide solution", ar: "محلول يوديد البوتاسيوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["irritant"], stock: { defaultVolumeMl: 10, concentration: 0.2 } }),
  S({ id: "pbi2", formula: "PbI2", name: { en: "Lead(II) iodide", ar: "يوديد الرصاص (II)" }, cls: "salt", state: "s", color: "#f5d000", tint: 1, hazards: ["toxic"] }),
  S({ id: "kno3", formula: "KNO3", name: { en: "Potassium nitrate", ar: "نترات البوتاسيوم" }, cls: "salt", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["oxidiser"] }),
  S({ id: "na", formula: "Na", name: { en: "Sodium metal (virtual only)", ar: "فلز الصوديوم (افتراضي فقط)" }, cls: "metal", state: "s", color: "#d9dadc", tint: 1, hazards: ["reactive", "corrosive", "flammable"], virtualOnly: true, stock: { defaultMassG: 0.1 } }),
  S({ id: "h2", formula: "H2", name: { en: "Hydrogen gas", ar: "غاز الهيدروجين" }, cls: "gas", state: "g", color: "#ffffff", tint: 0, hazards: ["flammable"] }),
  S({ id: "co2", formula: "CO2", name: { en: "Carbon dioxide", ar: "ثاني أكسيد الكربون" }, cls: "gas", state: "g", color: "#ffffff", tint: 0, hazards: ["none"] }),
  S({ id: "o2", formula: "O2", name: { en: "Oxygen", ar: "أكسجين" }, cls: "gas", state: "g", color: "#ffffff", tint: 0, hazards: ["oxidiser"] }),
  S({ id: "ethanol", formula: "C2H5OH", name: { en: "Ethanol", ar: "إيثانول" }, cls: "organic", state: "l", color: "#f3f7fa", tint: 0, hazards: ["flammable"], stock: { defaultVolumeMl: 10 } }),
  S({ id: "glucose", formula: "C6H12O6", name: { en: "Glucose", ar: "جلوكوز" }, cls: "organic", state: "s", color: "#fbfbfb", tint: 1, hazards: ["none"], stock: { defaultMassG: 2 } }),
  S({ id: "phenolphthalein", formula: "C20H14O4", name: { en: "Phenolphthalein indicator", ar: "دليل الفينولفثالين" }, cls: "indicator", state: "aq", color: "#f3f7fa", tint: 0, hazards: ["irritant"], stock: { defaultVolumeMl: 1, concentration: 0.003 } }),
  S({ id: "methyl-orange", formula: "C14H14N3NaO3S", name: { en: "Methyl orange indicator", ar: "دليل الميثيل البرتقالي" }, cls: "indicator", state: "aq", color: "#f39c12", tint: 0.4, hazards: ["toxic"], stock: { defaultVolumeMl: 1, concentration: 0.001 } }),
  S({ id: "litmus", formula: null, name: { en: "Litmus solution", ar: "محلول عباد الشمس" }, cls: "indicator", state: "aq", color: "#7d4fa0", tint: 0.5, hazards: ["none"], stock: { defaultVolumeMl: 1 } }),
  S({ id: "universal-indicator", formula: null, name: { en: "Universal indicator", ar: "الدليل العام" }, cls: "indicator", state: "aq", color: "#5fae3f", tint: 0.5, hazards: ["flammable"], stock: { defaultVolumeMl: 1 } }),
];

const byId = new Map(SUBSTANCES.map((s) => [s.id, s]));
export function getSubstance(id: string): Substance | undefined {
  return byId.get(id);
}

export function substanceMolarMass(s: Substance): number | null {
  return s.formula ? molarMass(s.formula) : null;
}

export function pubchemSearchUrl(s: Substance): string {
  return `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(s.name.en.replace(/\s*\(.*?\)\s*/g, " ").trim())}`;
}

export const STOCK_REAGENTS = SUBSTANCES.filter((s) => s.stock);
