/** Levels, XP thresholds and achievements — all configurable here and seeded to the DB. */

export interface LevelDef {
  level: number;
  xpRequired: number;
  title: { en: string; ar: string };
}

const NAMED: [string, string][] = [
  ["Laboratory Beginner", "مبتدئ المعمل"],
  ["Junior Explorer", "مستكشف ناشئ"],
  ["Science Apprentice", "متدرب علوم"],
  ["Circuit Builder", "باني الدوائر"],
  ["Chemistry Explorer", "مستكشف الكيمياء"],
  ["Experimental Scientist", "عالم تجريبي"],
  ["Physics Specialist", "متخصص فيزياء"],
  ["Chemistry Specialist", "متخصص كيمياء"],
  ["Master Experimenter", "خبير التجارب"],
  ["Research Scientist", "عالم باحث"],
];
const BANDS: [string, string][] = [
  ["Advanced Researcher", "باحث متقدم"],
  ["Expert Scientist", "عالم خبير"],
  ["Senior Laboratory Fellow", "زميل معمل أول"],
  ["Master of Science", "أستاذ العلوم"],
];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** XP needed to reach level n: smooth power curve, level 2 at 60 XP, level 50 ≈ 48k XP. */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round((60 * Math.pow(n - 1, 1.72)) / 10) * 10;
}

export const LEVELS: LevelDef[] = Array.from({ length: 50 }, (_, i) => {
  const n = i + 1;
  let title: { en: string; ar: string };
  if (n <= 10) title = { en: NAMED[i]![0], ar: NAMED[i]![1] };
  else if (n === 50) title = { en: "LabVerse Luminary", ar: "منارة LabVerse" };
  else {
    const band = BANDS[Math.floor((n - 11) / 10)]!;
    const r = ROMAN[(n - 11) % 10]!;
    title = { en: `${band[0]} ${r}`, ar: `${band[1]} ${r}` };
  }
  return { level: n, xpRequired: xpForLevel(n), title };
});

export function levelForXp(xp: number) {
  let cur = LEVELS[0]!;
  for (const l of LEVELS) if (xp >= l.xpRequired) cur = l;
  const next = LEVELS.find((l) => l.level === cur.level + 1) ?? null;
  const progress = next ? (xp - cur.xpRequired) / (next.xpRequired - cur.xpRequired) : 1;
  return { current: cur, next, progress: Math.max(0, Math.min(1, progress)) };
}

export type XpCategory = "physics" | "chemistry" | "circuit" | "experiment" | "general";

export interface AchievementDef {
  id: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
  xp: number;
  icon: string;
  category: XpCategory;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_experiment", title: { en: "First Experiment", ar: "التجربة الأولى" }, description: { en: "Complete your first guided experiment.", ar: "أكمل أول تجربة موجهة." }, xp: 30, icon: "flask", category: "experiment" },
  { id: "first_project", title: { en: "Saved for Science", ar: "محفوظ للعلم" }, description: { en: "Save your first project.", ar: "احفظ أول مشروع لك." }, xp: 15, icon: "save", category: "general" },
  { id: "first_valid_circuit", title: { en: "Let There Be Light", ar: "ليكن نور" }, description: { en: "Build a closed circuit that powers a load.", ar: "ابنِ دائرة مغلقة تشغّل حملاً." }, xp: 50, icon: "bulb", category: "circuit" },
  { id: "first_chem_reaction", title: { en: "First Reaction", ar: "التفاعل الأول" }, description: { en: "Observe your first validated chemical reaction.", ar: "شاهد أول تفاعل كيميائي موثق." }, xp: 40, icon: "beaker", category: "chemistry" },
  { id: "first_learning_path", title: { en: "Path Finder", ar: "مكتشف المسار" }, description: { en: "Complete every experiment in one curriculum unit.", ar: "أكمل كل تجارب وحدة دراسية." }, xp: 150, icon: "map", category: "experiment" },
  { id: "ohms_law_master", title: { en: "Ohm's Law Master", ar: "خبير قانون أوم" }, description: { en: "Complete the Ohm's law experiment and its quiz.", ar: "أكمل تجربة قانون أوم واختبارها." }, xp: 80, icon: "omega", category: "physics" },
  { id: "series_parallel_master", title: { en: "Series & Parallel Pro", ar: "محترف التوالي والتوازي" }, description: { en: "Complete both series and parallel circuit experiments.", ar: "أكمل تجربتي التوصيل على التوالي والتوازي." }, xp: 80, icon: "split", category: "physics" },
  { id: "led_master", title: { en: "Diode Whisperer", ar: "خبير الثنائيات" }, description: { en: "Light an LED safely with a current-limiting resistor.", ar: "أضئ ثنائياً باعثاً للضوء بأمان مع مقاومة حماية." }, xp: 40, icon: "led", category: "circuit" },
  { id: "electromagnet", title: { en: "Field Maker", ar: "صانع المجال" }, description: { en: "Energise an electromagnet.", ar: "شغّل مغناطيساً كهربياً." }, xp: 40, icon: "magnet", category: "physics" },
  { id: "chem_5_reactions", title: { en: "Reaction Collector", ar: "جامع التفاعلات" }, description: { en: "Observe 5 different validated reactions.", ar: "شاهد 5 تفاعلات موثقة مختلفة." }, xp: 60, icon: "atom", category: "chemistry" },
  { id: "chem_15_reactions", title: { en: "Chemistry Encyclopedia", ar: "موسوعة الكيمياء" }, description: { en: "Observe 15 different validated reactions.", ar: "شاهد 15 تفاعلاً موثقاً مختلفاً." }, xp: 150, icon: "book", category: "chemistry" },
  { id: "precipitate_hunter", title: { en: "Precipitate Hunter", ar: "صائد الرواسب" }, description: { en: "Produce 3 different precipitates.", ar: "كوّن 3 رواسب مختلفة." }, xp: 60, icon: "drop", category: "chemistry" },
  { id: "pyro_virtual", title: { en: "Safe Spark", ar: "شرارة آمنة" }, description: { en: "Watch a virtual-only combustion safely.", ar: "شاهد احتراقاً افتراضياً بأمان." }, xp: 30, icon: "flame", category: "chemistry" },
  { id: "genetics_explorer", title: { en: "Genetics Explorer", ar: "مستكشف الوراثة" }, description: { en: "Answer the Punnett square challenge correctly.", ar: "أجب عن تحدي مربع بانيت إجابة صحيحة." }, xp: 50, icon: "dna", category: "experiment" },
  { id: "time_traveller", title: { en: "Time Traveller", ar: "مسافر عبر الزمن" }, description: { en: "Order the geological eras correctly.", ar: "رتّب العصور الجيولوجية ترتيباً صحيحاً." }, xp: 50, icon: "clock", category: "experiment" },
];

export const XP = {
  reactionDiscovered: 10,
  quizCorrect: 10,
  dailyChallenge: 25,
} as const;
