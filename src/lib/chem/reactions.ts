/**
 * Validated reaction definitions. Every equation is atom-balance checked by the test suite.
 * Combinations that are not listed here are reported as "unsupported", never invented.
 */
export type ReactionType =
  | "combination"
  | "decomposition"
  | "single-displacement"
  | "double-displacement"
  | "precipitation"
  | "neutralization"
  | "redox"
  | "combustion"
  | "acid-carbonate"
  | "acid-metal";

export type SafetyClass = "school-safe" | "supervised" | "virtual-only";

export interface Term {
  id: string;
  coeff: number;
}

export interface ReactionDef {
  id: string;
  types: ReactionType[];
  reactants: Term[];
  products: Term[];
  conditions: {
    /** Minimum container temperature, °C (reached by heating). */
    minTempC?: number;
    /** Catalyst substance id that must be present (not consumed). */
    catalyst?: string;
    /** Reactant `o2` is supplied by air in an open container. */
    oxygenFromAir?: boolean;
    /** Reactant `water` is the solvent (always in excess when liquid is present). */
    waterIsSolvent?: boolean;
  };
  observations: {
    gas?: string; // substance id of evolved gas
    precipitate?: string; // substance id
    deposit?: string; // metal coating
    flame?: boolean;
    thermal: "exothermic" | "endothermic" | "slight";
    colorChange?: { en: string; ar: string };
  };
  /** Enthalpy per mole of reaction extent, kJ/mol (only where well established). */
  deltaH?: number;
  explanation: { en: string; ar: string };
  safety: SafetyClass;
  safetyNote?: { en: string; ar: string };
  provenance: string;
  curriculumTags?: string[];
}

export interface NoReactionDef {
  reactants: [string, string];
  explanation: { en: string; ar: string };
}

const PROV = "Standard school/introductory-chemistry reaction; balanced equation verified by automated atom count.";

export const REACTIONS: ReactionDef[] = [
  {
    id: "neutralization-hcl-naoh",
    types: ["neutralization", "double-displacement"],
    reactants: [{ id: "hcl", coeff: 1 }, { id: "naoh", coeff: 1 }],
    products: [{ id: "nacl", coeff: 1 }, { id: "water", coeff: 1 }],
    conditions: {},
    observations: { thermal: "exothermic" },
    deltaH: -57.6,
    explanation: {
      en: "H⁺ ions from the acid combine with OH⁻ ions from the base to form water; the solution warms up and a salt (NaCl) remains dissolved.",
      ar: "تتحد أيونات الهيدروجين من الحمض مع أيونات الهيدروكسيد من القاعدة لتكوين الماء؛ ترتفع درجة الحرارة ويبقى الملح (كلوريد الصوديوم) ذائباً.",
    },
    safety: "supervised",
    provenance: PROV + " ΔH ≈ −57.6 kJ/mol for strong acid–strong base.",
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "neutralization-h2so4-naoh",
    types: ["neutralization", "double-displacement"],
    reactants: [{ id: "h2so4", coeff: 1 }, { id: "naoh", coeff: 2 }],
    products: [{ id: "na2so4", coeff: 1 }, { id: "water", coeff: 2 }],
    conditions: {},
    observations: { thermal: "exothermic" },
    deltaH: -115.2,
    explanation: { en: "Sulfuric acid is diprotic: each molecule neutralises two OH⁻ ions.", ar: "حمض الكبريتيك ثنائي البروتون: كل جزيء يعادل أيونين من الهيدروكسيد." },
    safety: "supervised",
    provenance: PROV,
  },
  {
    id: "neutralization-acetic-naoh",
    types: ["neutralization"],
    reactants: [{ id: "acetic-acid", coeff: 1 }, { id: "naoh", coeff: 1 }],
    products: [{ id: "ch3coona", coeff: 1 }, { id: "water", coeff: 1 }],
    conditions: {},
    observations: { thermal: "exothermic" },
    explanation: { en: "A weak acid is neutralised by a strong base, forming sodium acetate.", ar: "يتعادل حمض ضعيف مع قاعدة قوية مكوناً أسيتات الصوديوم." },
    safety: "school-safe",
    provenance: PROV,
  },
  {
    id: "acid-metal-zn-hcl",
    types: ["acid-metal", "single-displacement", "redox"],
    reactants: [{ id: "zn", coeff: 1 }, { id: "hcl", coeff: 2 }],
    products: [{ id: "zncl2", coeff: 1 }, { id: "h2", coeff: 1 }],
    conditions: {},
    observations: { gas: "h2", thermal: "exothermic" },
    explanation: {
      en: "Zinc is above hydrogen in the activity series, so it displaces hydrogen from the acid. Bubbles of hydrogen gas form.",
      ar: "الخارصين يسبق الهيدروجين في متسلسلة النشاط الكيميائي، فيحل محله في الحمض وتتصاعد فقاعات غاز الهيدروجين.",
    },
    safety: "supervised",
    safetyNote: { en: "Hydrogen is flammable — no flames nearby in a real lab.", ar: "الهيدروجين قابل للاشتعال — أبعد اللهب في المعمل الحقيقي." },
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "acid-metal-mg-hcl",
    types: ["acid-metal", "single-displacement", "redox"],
    reactants: [{ id: "mg", coeff: 1 }, { id: "hcl", coeff: 2 }],
    products: [{ id: "mgcl2", coeff: 1 }, { id: "h2", coeff: 1 }],
    conditions: {},
    observations: { gas: "h2", thermal: "exothermic" },
    explanation: { en: "Magnesium reacts vigorously with dilute acid, releasing hydrogen.", ar: "يتفاعل الماغنسيوم بشدة مع الحمض المخفف ويتصاعد الهيدروجين." },
    safety: "supervised",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "acid-metal-fe-hcl",
    types: ["acid-metal", "single-displacement", "redox"],
    reactants: [{ id: "fe", coeff: 1 }, { id: "hcl", coeff: 2 }],
    products: [{ id: "fecl2", coeff: 1 }, { id: "h2", coeff: 1 }],
    conditions: {},
    observations: { gas: "h2", thermal: "slight", colorChange: { en: "Solution turns pale green (Fe²⁺).", ar: "يصبح المحلول أخضر باهتاً (أيونات Fe²⁺)." } },
    explanation: { en: "Iron displaces hydrogen more slowly than zinc or magnesium.", ar: "يحل الحديد محل الهيدروجين أبطأ من الخارصين والماغنسيوم." },
    safety: "supervised",
    provenance: PROV,
  },
  {
    id: "precip-agno3-nacl",
    types: ["precipitation", "double-displacement"],
    reactants: [{ id: "agno3", coeff: 1 }, { id: "nacl", coeff: 1 }],
    products: [{ id: "agcl", coeff: 1 }, { id: "nano3", coeff: 1 }],
    conditions: {},
    observations: { precipitate: "agcl", thermal: "slight" },
    explanation: { en: "Ag⁺ and Cl⁻ ions form insoluble silver chloride — a white precipitate. This is the classic test for chloride ions.", ar: "تتحد أيونات الفضة والكلوريد مكونة كلوريد الفضة غير الذائب — راسب أبيض. هذا كشف أيون الكلوريد." },
    safety: "supervised",
    safetyNote: { en: "Silver nitrate stains skin.", ar: "نترات الفضة تترك بقعاً على الجلد." },
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "precip-cuso4-naoh",
    types: ["precipitation", "double-displacement"],
    reactants: [{ id: "cuso4", coeff: 1 }, { id: "naoh", coeff: 2 }],
    products: [{ id: "cuoh2", coeff: 1 }, { id: "na2so4", coeff: 1 }],
    conditions: {},
    observations: { precipitate: "cuoh2", thermal: "slight", colorChange: { en: "Blue solution fades as a pale-blue precipitate forms.", ar: "يبهت اللون الأزرق للمحلول ويتكون راسب أزرق فاتح." } },
    explanation: { en: "Cu²⁺ ions combine with OH⁻ to form insoluble copper(II) hydroxide.", ar: "تتحد أيونات النحاس مع الهيدروكسيد مكونة هيدروكسيد النحاس غير الذائب." },
    safety: "supervised",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "precip-bacl2-na2so4",
    types: ["precipitation", "double-displacement"],
    reactants: [{ id: "bacl2", coeff: 1 }, { id: "na2so4", coeff: 1 }],
    products: [{ id: "baso4", coeff: 1 }, { id: "nacl", coeff: 2 }],
    conditions: {},
    observations: { precipitate: "baso4", thermal: "slight" },
    explanation: { en: "Ba²⁺ and SO₄²⁻ form insoluble barium sulfate — the test for sulfate ions.", ar: "تتحد أيونات الباريوم والكبريتات مكونة كبريتات الباريوم غير الذائبة — كشف أيون الكبريتات." },
    safety: "supervised",
    safetyNote: { en: "Soluble barium salts are toxic.", ar: "أملاح الباريوم الذائبة سامة." },
    provenance: PROV,
  },
  {
    id: "precip-pbno32-ki",
    types: ["precipitation", "double-displacement"],
    reactants: [{ id: "pbno32", coeff: 1 }, { id: "ki", coeff: 2 }],
    products: [{ id: "pbi2", coeff: 1 }, { id: "kno3", coeff: 2 }],
    conditions: {},
    observations: { precipitate: "pbi2", thermal: "slight", colorChange: { en: "Bright yellow precipitate ('golden rain').", ar: "راسب أصفر لامع." } },
    explanation: { en: "Pb²⁺ and I⁻ form insoluble yellow lead(II) iodide.", ar: "تتحد أيونات الرصاص واليوديد مكونة يوديد الرصاص الأصفر غير الذائب." },
    safety: "virtual-only",
    safetyNote: { en: "Lead compounds are toxic. Virtual demonstration only.", ar: "مركبات الرصاص سامة. عرض افتراضي فقط." },
    provenance: PROV,
  },
  {
    id: "precip-fecl3-naoh",
    types: ["precipitation", "double-displacement"],
    reactants: [{ id: "fecl3", coeff: 1 }, { id: "naoh", coeff: 3 }],
    products: [{ id: "feoh3", coeff: 1 }, { id: "nacl", coeff: 3 }],
    conditions: {},
    observations: { precipitate: "feoh3", thermal: "slight" },
    explanation: { en: "Fe³⁺ ions form a reddish-brown precipitate of iron(III) hydroxide.", ar: "تكوّن أيونات الحديد (III) راسباً بنياً محمراً من هيدروكسيد الحديد (III)." },
    safety: "supervised",
    provenance: PROV,
  },
  {
    id: "displacement-fe-cuso4",
    types: ["single-displacement", "redox"],
    reactants: [{ id: "fe", coeff: 1 }, { id: "cuso4", coeff: 1 }],
    products: [{ id: "feso4", coeff: 1 }, { id: "cu", coeff: 1 }],
    conditions: {},
    observations: { deposit: "cu", thermal: "slight", colorChange: { en: "Blue colour fades to pale green; reddish-brown copper deposits.", ar: "يزول اللون الأزرق ويصبح أخضر باهتاً ويترسب نحاس بني محمر." } },
    explanation: { en: "Iron is more active than copper, so it displaces copper from its salt solution.", ar: "الحديد أنشط من النحاس، فيحل محله في محلول ملحه." },
    safety: "school-safe",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "displacement-zn-cuso4",
    types: ["single-displacement", "redox"],
    reactants: [{ id: "zn", coeff: 1 }, { id: "cuso4", coeff: 1 }],
    products: [{ id: "znso4", coeff: 1 }, { id: "cu", coeff: 1 }],
    conditions: {},
    observations: { deposit: "cu", thermal: "exothermic", colorChange: { en: "Blue colour fades to colourless; copper deposits on the zinc.", ar: "يزول اللون الأزرق ويترسب النحاس على الخارصين." } },
    explanation: { en: "Zinc is more active than copper and displaces it.", ar: "الخارصين أنشط من النحاس فيحل محله." },
    safety: "school-safe",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "displacement-cu-agno3",
    types: ["single-displacement", "redox"],
    reactants: [{ id: "cu", coeff: 1 }, { id: "agno3", coeff: 2 }],
    products: [{ id: "cuno32", coeff: 1 }, { id: "ag", coeff: 2 }],
    conditions: {},
    observations: { deposit: "ag", thermal: "slight", colorChange: { en: "Solution slowly turns blue; silvery crystals grow on the copper.", ar: "يتحول المحلول تدريجياً للأزرق وتنمو بلورات فضية على النحاس." } },
    explanation: { en: "Copper is more active than silver and displaces it from silver nitrate.", ar: "النحاس أنشط من الفضة فيحل محلها في نترات الفضة." },
    safety: "supervised",
    provenance: PROV,
  },
  {
    id: "acid-carbonate-na2co3-hcl",
    types: ["acid-carbonate", "double-displacement"],
    reactants: [{ id: "na2co3", coeff: 1 }, { id: "hcl", coeff: 2 }],
    products: [{ id: "nacl", coeff: 2 }, { id: "water", coeff: 1 }, { id: "co2", coeff: 1 }],
    conditions: {},
    observations: { gas: "co2", thermal: "slight" },
    explanation: { en: "Acids react with carbonates to give a salt, water and carbon dioxide (effervescence).", ar: "تتفاعل الأحماض مع الكربونات مكونة ملحاً وماء وثاني أكسيد الكربون (فوران)." },
    safety: "school-safe",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "acid-carbonate-caco3-hcl",
    types: ["acid-carbonate", "double-displacement"],
    reactants: [{ id: "caco3", coeff: 1 }, { id: "hcl", coeff: 2 }],
    products: [{ id: "cacl2", coeff: 1 }, { id: "water", coeff: 1 }, { id: "co2", coeff: 1 }],
    conditions: {},
    observations: { gas: "co2", thermal: "slight" },
    explanation: { en: "Marble chips fizz in acid, releasing carbon dioxide.", ar: "يفور الرخام في الحمض ويتصاعد ثاني أكسيد الكربون." },
    safety: "school-safe",
    provenance: PROV,
  },
  {
    id: "acid-carbonate-nahco3-hcl",
    types: ["acid-carbonate"],
    reactants: [{ id: "nahco3", coeff: 1 }, { id: "hcl", coeff: 1 }],
    products: [{ id: "nacl", coeff: 1 }, { id: "water", coeff: 1 }, { id: "co2", coeff: 1 }],
    conditions: {},
    observations: { gas: "co2", thermal: "endothermic" },
    explanation: { en: "Hydrogen carbonate reacts with acid releasing CO₂.", ar: "تتفاعل البيكربونات مع الحمض ويتصاعد ثاني أكسيد الكربون." },
    safety: "school-safe",
    provenance: PROV,
  },
  {
    id: "acid-carbonate-nahco3-acetic",
    types: ["acid-carbonate"],
    reactants: [{ id: "nahco3", coeff: 1 }, { id: "acetic-acid", coeff: 1 }],
    products: [{ id: "ch3coona", coeff: 1 }, { id: "water", coeff: 1 }, { id: "co2", coeff: 1 }],
    conditions: {},
    observations: { gas: "co2", thermal: "endothermic" },
    explanation: { en: "Baking soda and vinegar fizz as carbon dioxide is released; the mixture cools slightly.", ar: "يفور بيكربونات الصوديوم مع الخل لتصاعد ثاني أكسيد الكربون وتنخفض الحرارة قليلاً." },
    safety: "school-safe",
    provenance: PROV,
  },
  {
    id: "decomp-h2o2-mno2",
    types: ["decomposition", "redox"],
    reactants: [{ id: "h2o2", coeff: 2 }],
    products: [{ id: "water", coeff: 2 }, { id: "o2", coeff: 1 }],
    conditions: { catalyst: "mno2" },
    observations: { gas: "o2", thermal: "exothermic" },
    explanation: { en: "MnO₂ catalyses the decomposition of hydrogen peroxide into water and oxygen. The catalyst is not consumed.", ar: "يُسرّع ثاني أكسيد المنجنيز تحلل فوق أكسيد الهيدروجين إلى ماء وأكسجين دون أن يُستهلك." },
    safety: "supervised",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "decomp-cuco3-heat",
    types: ["decomposition"],
    reactants: [{ id: "cuco3", coeff: 1 }],
    products: [{ id: "cuo", coeff: 1 }, { id: "co2", coeff: 1 }],
    conditions: { minTempC: 200 },
    observations: { gas: "co2", thermal: "endothermic", colorChange: { en: "Green powder turns black (copper(II) oxide).", ar: "يتحول المسحوق الأخضر إلى أسود (أكسيد النحاس II)." } },
    explanation: { en: "Thermal decomposition: heat breaks copper carbonate into copper oxide and carbon dioxide.", ar: "تحلل حراري: تفكك الحرارة كربونات النحاس إلى أكسيد النحاس وثاني أكسيد الكربون." },
    safety: "supervised",
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "decomp-cuoh2-heat",
    types: ["decomposition"],
    reactants: [{ id: "cuoh2", coeff: 1 }],
    products: [{ id: "cuo", coeff: 1 }, { id: "water", coeff: 1 }],
    conditions: { minTempC: 80 },
    observations: { thermal: "endothermic", colorChange: { en: "Blue precipitate turns black on heating.", ar: "يتحول الراسب الأزرق إلى أسود بالتسخين." } },
    explanation: { en: "Copper(II) hydroxide decomposes on heating into black copper(II) oxide and water.", ar: "يتحلل هيدروكسيد النحاس بالتسخين إلى أكسيد النحاس الأسود وماء." },
    safety: "supervised",
    provenance: PROV,
  },
  {
    id: "combination-fe-s",
    types: ["combination", "redox"],
    reactants: [{ id: "fe", coeff: 1 }, { id: "s", coeff: 1 }],
    products: [{ id: "fes", coeff: 1 }],
    conditions: { minTempC: 250 },
    observations: { thermal: "exothermic", colorChange: { en: "Yellow/grey mixture glows and forms a black solid.", ar: "يتوهج الخليط ويتكون جسم صلب أسود." } },
    explanation: { en: "Direct combination: iron and sulfur combine on heating to form iron(II) sulfide.", ar: "اتحاد مباشر: يتحد الحديد والكبريت بالتسخين لتكوين كبريتيد الحديد (II)." },
    safety: "virtual-only",
    safetyNote: { en: "Can release toxic sulfur dioxide. Virtual only.", ar: "قد ينطلق غاز ثاني أكسيد الكبريت السام. افتراضي فقط." },
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "combustion-mg",
    types: ["combustion", "combination", "redox"],
    reactants: [{ id: "mg", coeff: 2 }, { id: "o2", coeff: 1 }],
    products: [{ id: "mgo", coeff: 2 }],
    conditions: { minTempC: 300, oxygenFromAir: true },
    observations: { flame: true, thermal: "exothermic", colorChange: { en: "Brilliant white flame; white ash of magnesium oxide.", ar: "لهب أبيض ساطع؛ رماد أبيض من أكسيد الماغنسيوم." } },
    explanation: { en: "Magnesium burns in oxygen from the air, forming magnesium oxide.", ar: "يحترق الماغنسيوم في أكسجين الهواء مكوناً أكسيد الماغنسيوم." },
    safety: "virtual-only",
    safetyNote: { en: "Intense UV light can damage eyes. Virtual only.", ar: "الضوء الشديد قد يؤذي العين. افتراضي فقط." },
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "combustion-steel-wool",
    types: ["combustion", "combination", "redox"],
    reactants: [{ id: "steel-wool", coeff: 4 }, { id: "o2", coeff: 3 }],
    products: [{ id: "fe2o3", coeff: 2 }],
    conditions: { minTempC: 300, oxygenFromAir: true },
    observations: { flame: true, thermal: "exothermic", colorChange: { en: "Fibres glow orange and throw sparks; grey wool turns dark reddish-brown iron oxide.", ar: "تتوهج الألياف باللون البرتقالي وتتطاير الشرارات؛ يتحول الصوف الرمادي إلى أكسيد حديد بني محمر داكن." } },
    explanation: {
      en: "Fine iron fibres have a huge surface area, so they burn in air (combination with oxygen) even though an iron nail does not. The product is heavier than the original wool because oxygen has been added.",
      ar: "ألياف الحديد الرفيعة لها مساحة سطح كبيرة جداً فتحترق في الهواء (اتحاد مع الأكسجين) بينما لا يحترق مسمار الحديد. الناتج أثقل من الصوف الأصلي لأن الأكسجين اتحد معه.",
    },
    safety: "virtual-only",
    safetyNote: { en: "Sparks and hot metal can cause burns and fires. Virtual only.", ar: "الشرر والمعدن الساخن قد يسببان حروقاً وحرائق. افتراضي فقط." },
    provenance: PROV,
    curriculumTags: ["eg-g9-t1-u1"],
  },
  {
    id: "alkali-na-water",
    types: ["single-displacement", "redox"],
    reactants: [{ id: "na", coeff: 2 }, { id: "water", coeff: 2 }],
    products: [{ id: "naoh", coeff: 2 }, { id: "h2", coeff: 1 }],
    conditions: { waterIsSolvent: true },
    observations: { gas: "h2", flame: false, thermal: "exothermic" },
    explanation: { en: "Sodium reacts violently with water, forming sodium hydroxide and hydrogen.", ar: "يتفاعل الصوديوم بعنف مع الماء مكوناً هيدروكسيد الصوديوم والهيدروجين." },
    safety: "virtual-only",
    safetyNote: { en: "Dangerous: can ignite and explode. Never attempt outside a supervised demonstration.", ar: "خطر: قد يشتعل وينفجر. لا تحاول ذلك أبداً." },
    provenance: PROV,
  },
];

/** Explicitly documented non-reactions (valid science: "no reaction"). */
export const NO_REACTIONS: NoReactionDef[] = [
  { reactants: ["cu", "hcl"], explanation: { en: "Copper is below hydrogen in the activity series, so it does not react with dilute hydrochloric acid.", ar: "النحاس يلي الهيدروجين في متسلسلة النشاط فلا يتفاعل مع حمض الهيدروكلوريك المخفف." } },
  { reactants: ["cu", "h2so4"], explanation: { en: "Copper does not react with dilute sulfuric acid.", ar: "النحاس لا يتفاعل مع حمض الكبريتيك المخفف." } },
  { reactants: ["cu", "znso4"], explanation: { en: "Copper is less active than zinc and cannot displace it.", ar: "النحاس أقل نشاطاً من الخارصين فلا يحل محله." } },
  { reactants: ["cu", "feso4"], explanation: { en: "Copper is less active than iron and cannot displace it.", ar: "النحاس أقل نشاطاً من الحديد فلا يحل محله." } },
  { reactants: ["ag", "hcl"], explanation: { en: "Silver does not react with dilute acids.", ar: "الفضة لا تتفاعل مع الأحماض المخففة." } },
  { reactants: ["nacl", "kno3"], explanation: { en: "All possible products are soluble, so no precipitate forms.", ar: "جميع النواتج المحتملة ذائبة فلا يتكون راسب." } },
  { reactants: ["nacl", "na2so4"], explanation: { en: "Common ion, no reaction.", ar: "أيون مشترك، لا يحدث تفاعل." } },
];

export function findReactionById(id: string) {
  return REACTIONS.find((r) => r.id === id);
}
