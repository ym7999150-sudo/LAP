/**
 * Periodic table data.
 * Atomic weights: IUPAC abridged standard atomic weights (conventional values).
 * For elements without stable isotopes the value is the mass number of a long-lived
 * isotope as commonly tabulated, flagged with `massIsMassNumber`.
 * Electron configurations: Madelung (aufbau) order with the well-documented
 * ground-state exceptions listed below; Z > 103 are marked as predicted.
 */

type Row = [number, string, string, string, number, boolean?];

// [Z, symbol, English name, Arabic name, atomic weight, massIsMassNumber]
const ROWS: Row[] = [
  [1, "H", "Hydrogen", "هيدروجين", 1.008],
  [2, "He", "Helium", "هيليوم", 4.0026],
  [3, "Li", "Lithium", "ليثيوم", 6.94],
  [4, "Be", "Beryllium", "بيريليوم", 9.0122],
  [5, "B", "Boron", "بورون", 10.81],
  [6, "C", "Carbon", "كربون", 12.011],
  [7, "N", "Nitrogen", "نيتروجين", 14.007],
  [8, "O", "Oxygen", "أكسجين", 15.999],
  [9, "F", "Fluorine", "فلور", 18.998],
  [10, "Ne", "Neon", "نيون", 20.18],
  [11, "Na", "Sodium", "صوديوم", 22.99],
  [12, "Mg", "Magnesium", "ماغنسيوم", 24.305],
  [13, "Al", "Aluminium", "ألومنيوم", 26.982],
  [14, "Si", "Silicon", "سيليكون", 28.085],
  [15, "P", "Phosphorus", "فوسفور", 30.974],
  [16, "S", "Sulfur", "كبريت", 32.06],
  [17, "Cl", "Chlorine", "كلور", 35.45],
  [18, "Ar", "Argon", "أرجون", 39.95],
  [19, "K", "Potassium", "بوتاسيوم", 39.098],
  [20, "Ca", "Calcium", "كالسيوم", 40.078],
  [21, "Sc", "Scandium", "سكانديوم", 44.956],
  [22, "Ti", "Titanium", "تيتانيوم", 47.867],
  [23, "V", "Vanadium", "فاناديوم", 50.942],
  [24, "Cr", "Chromium", "كروم", 51.996],
  [25, "Mn", "Manganese", "منجنيز", 54.938],
  [26, "Fe", "Iron", "حديد", 55.845],
  [27, "Co", "Cobalt", "كوبالت", 58.933],
  [28, "Ni", "Nickel", "نيكل", 58.693],
  [29, "Cu", "Copper", "نحاس", 63.546],
  [30, "Zn", "Zinc", "خارصين", 65.38],
  [31, "Ga", "Gallium", "جاليوم", 69.723],
  [32, "Ge", "Germanium", "جرمانيوم", 72.63],
  [33, "As", "Arsenic", "زرنيخ", 74.922],
  [34, "Se", "Selenium", "سيلينيوم", 78.971],
  [35, "Br", "Bromine", "بروم", 79.904],
  [36, "Kr", "Krypton", "كريبتون", 83.798],
  [37, "Rb", "Rubidium", "روبيديوم", 85.468],
  [38, "Sr", "Strontium", "سترونشيوم", 87.62],
  [39, "Y", "Yttrium", "إتريوم", 88.906],
  [40, "Zr", "Zirconium", "زركونيوم", 91.224],
  [41, "Nb", "Niobium", "نيوبيوم", 92.906],
  [42, "Mo", "Molybdenum", "موليبدنوم", 95.95],
  [43, "Tc", "Technetium", "تكنيشيوم", 98, true],
  [44, "Ru", "Ruthenium", "روثينيوم", 101.07],
  [45, "Rh", "Rhodium", "روديوم", 102.91],
  [46, "Pd", "Palladium", "بلاديوم", 106.42],
  [47, "Ag", "Silver", "فضة", 107.87],
  [48, "Cd", "Cadmium", "كادميوم", 112.41],
  [49, "In", "Indium", "إنديوم", 114.82],
  [50, "Sn", "Tin", "قصدير", 118.71],
  [51, "Sb", "Antimony", "أنتيمون", 121.76],
  [52, "Te", "Tellurium", "تيلوريوم", 127.6],
  [53, "I", "Iodine", "يود", 126.9],
  [54, "Xe", "Xenon", "زينون", 131.29],
  [55, "Cs", "Caesium", "سيزيوم", 132.91],
  [56, "Ba", "Barium", "باريوم", 137.33],
  [57, "La", "Lanthanum", "لانثانوم", 138.91],
  [58, "Ce", "Cerium", "سيريوم", 140.12],
  [59, "Pr", "Praseodymium", "براسيوديميوم", 140.91],
  [60, "Nd", "Neodymium", "نيوديميوم", 144.24],
  [61, "Pm", "Promethium", "بروميثيوم", 145, true],
  [62, "Sm", "Samarium", "ساماريوم", 150.36],
  [63, "Eu", "Europium", "يوروبيوم", 151.96],
  [64, "Gd", "Gadolinium", "جادولينيوم", 157.25],
  [65, "Tb", "Terbium", "تيربيوم", 158.93],
  [66, "Dy", "Dysprosium", "ديسبروسيوم", 162.5],
  [67, "Ho", "Holmium", "هولميوم", 164.93],
  [68, "Er", "Erbium", "إربيوم", 167.26],
  [69, "Tm", "Thulium", "ثوليوم", 168.93],
  [70, "Yb", "Ytterbium", "إتربيوم", 173.05],
  [71, "Lu", "Lutetium", "لوتيتيوم", 174.97],
  [72, "Hf", "Hafnium", "هافنيوم", 178.49],
  [73, "Ta", "Tantalum", "تنتالوم", 180.95],
  [74, "W", "Tungsten", "تنجستن", 183.84],
  [75, "Re", "Rhenium", "رينيوم", 186.21],
  [76, "Os", "Osmium", "أوزميوم", 190.23],
  [77, "Ir", "Iridium", "إيريديوم", 192.22],
  [78, "Pt", "Platinum", "بلاتين", 195.08],
  [79, "Au", "Gold", "ذهب", 196.97],
  [80, "Hg", "Mercury", "زئبق", 200.59],
  [81, "Tl", "Thallium", "ثاليوم", 204.38],
  [82, "Pb", "Lead", "رصاص", 207.2],
  [83, "Bi", "Bismuth", "بزموت", 208.98],
  [84, "Po", "Polonium", "بولونيوم", 209, true],
  [85, "At", "Astatine", "أستاتين", 210, true],
  [86, "Rn", "Radon", "رادون", 222, true],
  [87, "Fr", "Francium", "فرانسيوم", 223, true],
  [88, "Ra", "Radium", "راديوم", 226, true],
  [89, "Ac", "Actinium", "أكتينيوم", 227, true],
  [90, "Th", "Thorium", "ثوريوم", 232.04],
  [91, "Pa", "Protactinium", "بروتكتينيوم", 231.04],
  [92, "U", "Uranium", "يورانيوم", 238.03],
  [93, "Np", "Neptunium", "نبتونيوم", 237, true],
  [94, "Pu", "Plutonium", "بلوتونيوم", 244, true],
  [95, "Am", "Americium", "أمريسيوم", 243, true],
  [96, "Cm", "Curium", "كوريوم", 247, true],
  [97, "Bk", "Berkelium", "بركيليوم", 247, true],
  [98, "Cf", "Californium", "كاليفورنيوم", 251, true],
  [99, "Es", "Einsteinium", "أينشتاينيوم", 252, true],
  [100, "Fm", "Fermium", "فيرميوم", 257, true],
  [101, "Md", "Mendelevium", "مندليفيوم", 258, true],
  [102, "No", "Nobelium", "نوبليوم", 259, true],
  [103, "Lr", "Lawrencium", "لورنسيوم", 266, true],
  [104, "Rf", "Rutherfordium", "رذرفورديوم", 267, true],
  [105, "Db", "Dubnium", "دوبنيوم", 268, true],
  [106, "Sg", "Seaborgium", "سيبورجيوم", 269, true],
  [107, "Bh", "Bohrium", "بوريوم", 270, true],
  [108, "Hs", "Hassium", "هاسيوم", 269, true],
  [109, "Mt", "Meitnerium", "مايتنريوم", 278, true],
  [110, "Ds", "Darmstadtium", "دارمشتاتيوم", 281, true],
  [111, "Rg", "Roentgenium", "رونتجينيوم", 282, true],
  [112, "Cn", "Copernicium", "كوبرنيسيوم", 285, true],
  [113, "Nh", "Nihonium", "نيهونيوم", 286, true],
  [114, "Fl", "Flerovium", "فليروفيوم", 289, true],
  [115, "Mc", "Moscovium", "موسكوفيوم", 290, true],
  [116, "Lv", "Livermorium", "ليفرموريوم", 293, true],
  [117, "Ts", "Tennessine", "تينيسين", 294, true],
  [118, "Og", "Oganesson", "أوغانيسون", 294, true],
];

export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth-metal"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "nonmetal"
  | "halogen"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown";

export interface ElementData {
  z: number;
  symbol: string;
  name: { en: string; ar: string };
  atomicMass: number;
  massIsMassNumber: boolean;
  period: number;
  /** IUPAC group 1–18; null for the f-block (lanthanides/actinides). */
  group: number | null;
  category: ElementCategory;
  electronConfiguration: string;
  configurationPredicted: boolean;
  /** Position in the 18-column display grid (row 8/9 = f-block rows). */
  grid: { row: number; col: number };
}

const PERIOD_END = [2, 10, 18, 36, 54, 86, 118];

function periodOf(z: number) {
  return PERIOD_END.findIndex((e) => z <= e) + 1;
}

function groupOf(z: number): number | null {
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return null;
  const p = periodOf(z);
  const start = p === 1 ? 1 : PERIOD_END[p - 2]! + 1;
  const pos = z - start; // 0-based within period
  if (p === 1) return z === 1 ? 1 : 18;
  if (p <= 3) return pos < 2 ? pos + 1 : pos + 11;
  if (p <= 5) return pos + 1;
  // periods 6 & 7: s(2) + f(15, La/Ac included) + d(9) + p(6)
  if (pos < 2) return pos + 1;
  return pos - 14 + 1; // after the 15 f-block elements: Hf/Rf → group 4
}

const METALLOIDS = new Set([5, 14, 32, 33, 51, 52]);
const HALOGENS = new Set([9, 17, 35, 53, 85, 117]);
const NONMETALS = new Set([1, 6, 7, 8, 15, 16, 34]);
const POST_TRANSITION = new Set([13, 31, 49, 50, 81, 82, 83, 84]);
const UNKNOWN_PROPS = new Set([109, 110, 111, 113, 114, 115, 116, 118]);

function categoryOf(z: number, group: number | null): ElementCategory {
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  if (UNKNOWN_PROPS.has(z)) return "unknown";
  if (group === 18) return "noble-gas";
  if (HALOGENS.has(z)) return "halogen";
  if (METALLOIDS.has(z)) return "metalloid";
  if (NONMETALS.has(z)) return "nonmetal";
  if (group === 1) return "alkali-metal";
  if (group === 2) return "alkaline-earth-metal";
  if (POST_TRANSITION.has(z)) return "post-transition-metal";
  if (group !== null && group >= 3 && group <= 12) return "transition-metal";
  return "unknown";
}

// Madelung filling order.
const ORBITALS: [string, number][] = [
  ["1s", 2], ["2s", 2], ["2p", 6], ["3s", 2], ["3p", 6], ["4s", 2], ["3d", 10], ["4p", 6], ["5s", 2], ["4d", 10], ["5p", 6],
  ["6s", 2], ["4f", 14], ["5d", 10], ["6p", 6], ["7s", 2], ["5f", 14], ["6d", 10], ["7p", 6],
];
const NOBLE: [number, string][] = [[86, "Rn"], [54, "Xe"], [36, "Kr"], [18, "Ar"], [10, "Ne"], [2, "He"]];

const EXCEPTIONS: Record<number, string> = {
  24: "[Ar] 3d5 4s1",
  29: "[Ar] 3d10 4s1",
  41: "[Kr] 4d4 5s1",
  42: "[Kr] 4d5 5s1",
  44: "[Kr] 4d7 5s1",
  45: "[Kr] 4d8 5s1",
  46: "[Kr] 4d10",
  47: "[Kr] 4d10 5s1",
  57: "[Xe] 5d1 6s2",
  58: "[Xe] 4f1 5d1 6s2",
  64: "[Xe] 4f7 5d1 6s2",
  78: "[Xe] 4f14 5d9 6s1",
  79: "[Xe] 4f14 5d10 6s1",
  89: "[Rn] 6d1 7s2",
  90: "[Rn] 6d2 7s2",
  91: "[Rn] 5f2 6d1 7s2",
  92: "[Rn] 5f3 6d1 7s2",
  93: "[Rn] 5f4 6d1 7s2",
  96: "[Rn] 5f7 6d1 7s2",
  103: "[Rn] 5f14 7s2 7p1",
};

function fill(z: number): [string, number][] {
  let left = z;
  const out: [string, number][] = [];
  for (const [orb, cap] of ORBITALS) {
    if (left <= 0) break;
    const n = Math.min(cap, left);
    out.push([orb, n]);
    left -= n;
  }
  return out;
}

function configuration(z: number): string {
  if (EXCEPTIONS[z]) return EXCEPTIONS[z]!;
  const core = NOBLE.find(([nz]) => nz < z);
  const full = fill(z);
  if (!core) return full.map(([o, n]) => `${o}${n}`).join(" ");
  const coreLen = fill(core[0]).length;
  const valence = full.slice(coreLen).sort((a, b) => Number(a[0][0]) - Number(b[0][0]) || "spdf".indexOf(a[0][1]!) - "spdf".indexOf(b[0][1]!));
  return `[${core[1]}] ${valence.map(([o, n]) => `${o}${n}`).join(" ")}`;
}

export const ELEMENTS: ElementData[] = ROWS.map(([z, symbol, en, ar, mass, mn]) => {
  const group = groupOf(z);
  const period = periodOf(z);
  let grid: { row: number; col: number };
  if (z >= 57 && z <= 71) grid = { row: 9, col: z - 57 + 3 };
  else if (z >= 89 && z <= 103) grid = { row: 10, col: z - 89 + 3 };
  else grid = { row: period, col: group! };
  return {
    z,
    symbol,
    name: { en, ar },
    atomicMass: mass,
    massIsMassNumber: !!mn,
    period,
    group,
    category: categoryOf(z, group),
    electronConfiguration: configuration(z),
    configurationPredicted: z > 103,
    grid,
  };
});

export const ATOMIC_MASS: Record<string, number> = Object.fromEntries(ROWS.map((r) => [r[1], r[4]]));

export function getElement(symbolOrZ: string | number): ElementData | undefined {
  return ELEMENTS.find((e) => e.symbol === symbolOrZ || e.z === symbolOrZ);
}

export const ELEMENT_DATA_SOURCE =
  "IUPAC Commission on Isotopic Abundances and Atomic Weights — abridged standard atomic weights; configurations per aufbau principle with documented exceptions.";
