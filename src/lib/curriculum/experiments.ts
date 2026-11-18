/**
 * Guided experiments (editable content, seeded to `experiment_definitions`).
 *
 * CURRICULUM NOTE: the Egyptian Grade 9 (Third Preparatory) First-Term mapping below
 * is a configurable draft. It has NOT been verified against the official 2026–2027
 * Ministry textbook, so every unit carries `verified: false` and the UI says so.
 * Quiz answers live in ./answers.ts (server only).
 */
import type { Lab } from "@/lib/registry";

type L = { en: string; ar: string };
const t = (en: string, ar: string): L => ({ en, ar });

export interface CurriculumUnit {
  id: string;
  program: string;
  number: number;
  title: L;
  verified: boolean;
}

export const CURRICULUM_PROGRAMS = [
  { id: "eg-prep3-t1-2026", title: t("Egypt · Grade 9 (Third Preparatory) · Science · First Term 2026–2027", "مصر · الصف الثالث الإعدادي · العلوم · الفصل الدراسي الأول 2026–2027"), verified: false },
];

export const UNITS: CurriculumUnit[] = [
  { id: "eg-g9-t1-u1", program: "eg-prep3-t1-2026", number: 1, title: t("Chemical reactions and their environmental effects", "التفاعلات الكيميائية وتأثيراتها البيئية"), verified: false },
  { id: "eg-g9-t1-u2", program: "eg-prep3-t1-2026", number: 2, title: t("Electricity and magnetism", "الكهربية والمغناطيسية"), verified: false },
  { id: "eg-g9-t1-u3", program: "eg-prep3-t1-2026", number: 3, title: t("Heredity and variation of traits", "الوراثة وتنوع الصفات"), verified: false },
  { id: "eg-g9-t1-u4", program: "eg-prep3-t1-2026", number: 4, title: t("Earth's history and the fossil record", "تاريخ الأرض والسجل الحفري"), verified: false },
];

export interface QuizQuestion {
  id: string;
  prompt: L;
  options: L[];
  hint: L;
}

export interface TemplateObject {
  type: string;
  position: [number, number, number];
  props?: Record<string, number | boolean | string>;
}

export interface ExperimentDef {
  id: string;
  lab: Lab | "biology" | "earth";
  unit?: string;
  difficulty: 1 | 2 | 3;
  xp: number;
  title: L;
  objective: L;
  equipment: string[];
  steps: L[];
  safety: L[];
  expected: L[];
  explanation: L;
  teacherNotes?: L;
  questions: QuizQuestion[];
  hints: L[];
  template: TemplateObject[];
  /** Criteria id evaluated by ./criteria.ts on the server. */
  criteria: string;
  completion: L;
  achievement?: string;
}

const P = (type: string, x: number, z: number, props?: TemplateObject["props"]): TemplateObject => ({ type, position: [x, 0, z], props });

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: "closed-circuit",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 1,
    xp: 40,
    title: t("Build a closed circuit", "بناء دائرة كهربية مغلقة"),
    objective: t("Light a bulb by forming a complete path for current.", "إضاءة مصباح بتكوين مسار كامل للتيار."),
    equipment: ["battery", "switch", "bulb"],
    steps: [
      t("Connect the battery's + terminal to the switch.", "صِل الطرف الموجب للبطارية بالمفتاح."),
      t("Connect the switch to one terminal of the bulb.", "صِل المفتاح بأحد طرفي المصباح."),
      t("Connect the bulb's other terminal to the battery's − terminal.", "صِل الطرف الآخر للمصباح بالطرف السالب للبطارية."),
      t("Close the switch and press Run.", "أغلق المفتاح واضغط تشغيل."),
    ],
    safety: [t("Never connect a battery's terminals directly together (short circuit).", "لا تصل طرفي البطارية معاً مباشرة (قصر الدائرة).")],
    expected: [t("The bulb glows only when the switch is closed.", "يضيء المصباح فقط عند غلق المفتاح.")],
    explanation: t("Current flows only around a complete (closed) loop. Opening the switch breaks the loop.", "يمر التيار فقط في مسار مغلق كامل. فتح المفتاح يقطع المسار."),
    questions: [
      { id: "q1", prompt: t("What happens when the switch is opened?", "ماذا يحدث عند فتح المفتاح؟"), options: [t("The bulb gets brighter", "يزداد سطوع المصباح"), t("The bulb goes out", "ينطفئ المصباح"), t("Nothing changes", "لا يتغير شيء")], hint: t("Is the path still complete?", "هل ما زال المسار مكتملاً؟") },
    ],
    hints: [t("Follow the path from + back to − with your finger.", "تتبّع المسار من الموجب حتى السالب.")],
    template: [P("battery", -1.4, 0), P("switch", 0, -0.9), P("bulb", 1.4, 0)],
    criteria: "bulb-lit-with-switch",
    completion: t("A bulb is lit through a closed switch.", "مصباح مضاء عبر مفتاح مغلق."),
    achievement: "first_valid_circuit",
  },
  {
    id: "conductors-insulators",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 1,
    xp: 40,
    title: t("Conductors and insulators", "الموصلات والعوازل"),
    objective: t("Test which materials let current pass.", "اختبار المواد التي تسمح بمرور التيار."),
    equipment: ["battery", "bulb", "conductivity-tester"],
    steps: [
      t("Build a series loop: battery → material sample → bulb → battery.", "كوّن دائرة توالٍ: بطارية ← عينة ← مصباح ← بطارية."),
      t("Run the circuit, then change the sample's material in the inspector.", "شغّل الدائرة ثم غيّر مادة العينة من لوحة الخصائص."),
      t("Find one conductor that lights the bulb.", "ابحث عن موصل يضيء المصباح."),
    ],
    safety: [],
    expected: [t("Metals and graphite light the bulb; plastic, wood, glass and rubber do not.", "الفلزات والجرافيت تضيء المصباح؛ البلاستيك والخشب والزجاج والمطاط لا تضيئه.")],
    explanation: t("Conductors contain free charge carriers (electrons in metals); insulators do not.", "تحتوي الموصلات على شحنات حرة الحركة (الإلكترونات في الفلزات)؛ العوازل لا تحتوي عليها."),
    questions: [
      { id: "q1", prompt: t("Which material is an insulator?", "أي المواد التالية عازل؟"), options: [t("Copper", "النحاس"), t("Graphite", "الجرافيت"), t("Rubber", "المطاط")], hint: t("Electrical cables are coated with it.", "تُغلّف به الأسلاك الكهربية.") },
    ],
    hints: [t("The sample must be in series with the bulb.", "يجب أن تكون العينة على التوالي مع المصباح.")],
    template: [P("battery", -1.4, 0), P("conductivity-tester", 0, -0.9), P("bulb", 1.4, 0)],
    criteria: "conductor-test",
    completion: t("A conducting sample lights the bulb in series.", "عينة موصلة تضيء المصباح على التوالي."),
  },
  {
    id: "measure-v-i",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 50,
    title: t("Measuring voltage and current", "قياس الجهد وشدة التيار"),
    objective: t("Use an ammeter in series and a voltmeter in parallel.", "استخدام الأميتر على التوالي والفولتميتر على التوازي."),
    equipment: ["battery", "ammeter", "resistor", "voltmeter"],
    steps: [
      t("Connect battery → ammeter → resistor → battery.", "صِل البطارية ← الأميتر ← المقاومة ← البطارية."),
      t("Connect the voltmeter across the resistor.", "صِل الفولتميتر بين طرفي المقاومة."),
      t("Run and read both meters.", "شغّل واقرأ الجهازين."),
    ],
    safety: [t("An ammeter connected in parallel acts as a short circuit.", "الأميتر الموصل على التوازي يعمل كقصر للدائرة.")],
    expected: [t("Both meters show non-zero readings.", "يُظهر الجهازان قراءات غير صفرية.")],
    explanation: t("An ammeter has tiny resistance so it does not disturb the current; a voltmeter has huge resistance so it draws almost no current.", "مقاومة الأميتر صغيرة جداً فلا تؤثر في التيار؛ ومقاومة الفولتميتر كبيرة جداً فلا يسحب تياراً يُذكر."),
    questions: [
      { id: "q1", prompt: t("How is a voltmeter connected?", "كيف يوصل الفولتميتر؟"), options: [t("In series", "على التوالي"), t("In parallel", "على التوازي")], hint: t("It compares two points.", "يقارن بين نقطتين.") },
    ],
    hints: [],
    template: [P("battery", -1.6, 0), P("ammeter", -0.4, -1), P("resistor", 1, 0), P("voltmeter", 1, 1.1)],
    criteria: "meters-reading",
    completion: t("Ammeter in series and voltmeter across the resistor both read.", "الأميتر على التوالي والفولتميتر على المقاومة يقرآن."),
  },
  {
    id: "ohms-law",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 70,
    title: t("Ohm's law", "قانون أوم"),
    objective: t("Show that V / I equals the resistance.", "إثبات أن V / I تساوي المقاومة."),
    equipment: ["dc-source", "ammeter", "resistor", "voltmeter"],
    steps: [
      t("Build the measuring circuit from the previous experiment using the adjustable supply.", "كوّن دائرة القياس السابقة باستخدام مصدر الجهد المتغير."),
      t("Change the supply voltage and note how the current changes.", "غيّر جهد المصدر ولاحظ تغير التيار."),
      t("Compare V ÷ I with the resistor value.", "قارن V ÷ I بقيمة المقاومة."),
    ],
    safety: [],
    expected: [t("Current is proportional to voltage; V/I stays constant.", "يتناسب التيار طردياً مع الجهد؛ وتبقى V/I ثابتة.")],
    explanation: t("Ohm's law: at constant temperature, the current through a conductor is proportional to the voltage across it: V = I × R.", "قانون أوم: عند ثبوت درجة الحرارة تتناسب شدة التيار المار في موصل طردياً مع فرق الجهد بين طرفيه: V = I × R."),
    questions: [
      { id: "q1", prompt: t("A 10 Ω resistor has 5 V across it. What is the current?", "مقاومة 10 أوم فرق الجهد بين طرفيها 5 فولت. ما شدة التيار؟"), options: [t("50 A", "50 أمبير"), t("0.5 A", "0.5 أمبير"), t("2 A", "2 أمبير")], hint: t("I = V / R", "I = V / R") },
      { id: "q2", prompt: t("If the voltage doubles, the current…", "إذا تضاعف الجهد فإن التيار…"), options: [t("doubles", "يتضاعف"), t("halves", "يقل للنصف"), t("stays the same", "يبقى كما هو")], hint: t("They are proportional.", "العلاقة طردية.") },
    ],
    hints: [],
    template: [P("dc-source", -1.6, 0), P("ammeter", -0.4, -1), P("resistor", 1, 0, { resistance: 10 }), P("voltmeter", 1, 1.1)],
    criteria: "ohms-law",
    completion: t("Meter readings confirm V/I ≈ R within 5 %.", "قراءات الأجهزة تؤكد V/I ≈ R بفارق أقل من 5%."),
    achievement: "ohms_law_master",
  },
  {
    id: "series-circuit",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 50,
    title: t("Bulbs in series", "توصيل المصابيح على التوالي"),
    objective: t("Light two bulbs in one loop and compare brightness.", "إضاءة مصباحين في مسار واحد ومقارنة السطوع."),
    equipment: ["battery", "bulb", "bulb"],
    steps: [t("Connect battery → bulb 1 → bulb 2 → battery.", "صِل البطارية ← المصباح 1 ← المصباح 2 ← البطارية."), t("Run and compare the current in each bulb.", "شغّل وقارن التيار في كل مصباح.")],
    safety: [],
    expected: [t("Same current through both; each is dimmer than a single bulb.", "التيار نفسه في المصباحين؛ وكل منهما أخفت من مصباح منفرد.")],
    explanation: t("In series, resistances add (R = R₁ + R₂), so the current is smaller and is the same everywhere.", "في التوالي تُجمع المقاومات (R = R₁ + R₂) فيقل التيار ويكون واحداً في كل الأجزاء."),
    questions: [{ id: "q1", prompt: t("If one series bulb breaks, the other…", "إذا تلف أحد مصباحي التوالي فإن الآخر…"), options: [t("goes out", "ينطفئ"), t("gets brighter", "يزداد سطوعه")], hint: t("Is there still a path?", "هل ما زال هناك مسار؟") }],
    hints: [],
    template: [P("battery", -1.4, 0), P("bulb", 0.3, -0.9), P("bulb", 1.4, 0.4)],
    criteria: "series-bulbs",
    completion: t("Two bulbs lit in series carry the same current.", "مصباحان مضاءان على التوالي يمر بهما التيار نفسه."),
  },
  {
    id: "parallel-circuit",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 50,
    title: t("Bulbs in parallel", "توصيل المصابيح على التوازي"),
    objective: t("Give each bulb its own branch.", "إعطاء كل مصباح فرعاً مستقلاً."),
    equipment: ["battery", "bulb", "bulb"],
    steps: [t("Connect both bulbs directly across the battery terminals.", "صِل كلا المصباحين مباشرة بين طرفي البطارية."), t("Run and compare voltages and the battery current.", "شغّل وقارن الجهود وتيار البطارية.")],
    safety: [],
    expected: [t("Both bulbs have the full battery voltage and shine brightly.", "يحصل كل مصباح على جهد البطارية كاملاً ويضيء بقوة.")],
    explanation: t("In parallel the voltage is the same across each branch and the currents add: I = I₁ + I₂.", "في التوازي يتساوى الجهد على الفروع وتُجمع التيارات: I = I₁ + I₂."),
    questions: [{ id: "q1", prompt: t("Homes are wired in…", "توصل الأجهزة في المنازل على…"), options: [t("series", "التوالي"), t("parallel", "التوازي")], hint: t("Turning off one lamp doesn't turn off the fridge.", "إطفاء مصباح لا يطفئ الثلاجة.") }],
    hints: [],
    template: [P("battery", -1.4, 0), P("bulb", 0.6, -0.8), P("bulb", 0.6, 0.8)],
    criteria: "parallel-bulbs",
    completion: t("Two lit bulbs in parallel with source current ≈ sum of branches.", "مصباحان مضاءان على التوازي وتيار المصدر ≈ مجموع الفروع."),
    achievement: "series_parallel_master",
  },
  {
    id: "electric-power",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 50,
    title: t("Electrical power", "القدرة الكهربية"),
    objective: t("Measure V and I for a heater and compute P = V × I.", "قياس الجهد والتيار لسخان وحساب القدرة P = V × I."),
    equipment: ["battery", "ammeter", "heater", "voltmeter"],
    steps: [t("Measure current through and voltage across the heater.", "قِس التيار المار في السخان والجهد بين طرفيه."), t("Multiply them and compare with the inspector's power.", "اضربهما وقارن الناتج بالقدرة في لوحة الخصائص.")],
    safety: [],
    expected: [t("V × I equals the dissipated power.", "حاصل V × I يساوي القدرة المبددة.")],
    explanation: t("Power is the rate of energy transfer: P = V I = I²R = V²/R.", "القدرة هي معدل نقل الطاقة: P = V I = I²R = V²/R."),
    questions: [{ id: "q1", prompt: t("A heater draws 2 A at 12 V. Its power is…", "سخان يسحب 2 أمبير عند 12 فولت. قدرته…"), options: [t("6 W", "6 وات"), t("24 W", "24 وات"), t("14 W", "14 وات")], hint: t("P = V × I", "P = V × I") }],
    hints: [],
    template: [P("battery", -1.6, 0, { voltage: 12 }), P("ammeter", -0.4, -1), P("heater", 1, 0), P("voltmeter", 1, 1.1)],
    criteria: "power-measure",
    completion: t("Heater powered with both meters reading.", "السخان يعمل والجهازان يقرآن."),
  },
  {
    id: "electromagnet",
    lab: "physics",
    unit: "eg-g9-t1-u2",
    difficulty: 2,
    xp: 60,
    title: t("Magnetic effect of current: the electromagnet", "التأثير المغناطيسي للتيار: المغناطيس الكهربي"),
    objective: t("Energise a coil and watch the compass deflect.", "شغّل ملفاً ولاحظ انحراف البوصلة."),
    equipment: ["battery", "switch", "electromagnet", "compass"],
    steps: [t("Wire the coil in series with the switch and battery.", "صِل الملف على التوالي مع المفتاح والبطارية."), t("Place the compass near the coil, close the switch and run.", "ضع البوصلة قرب الملف وأغلق المفتاح وشغّل."), t("Increase the turns or voltage and compare.", "زِد عدد اللفات أو الجهد وقارن.")],
    safety: [t("Coils get warm with large currents.", "تسخن الملفات مع التيارات الكبيرة.")],
    expected: [t("The compass deflects; the field grows with current and number of turns.", "تنحرف البوصلة؛ ويزداد المجال بزيادة التيار وعدد اللفات.")],
    explanation: t("A current-carrying coil produces a magnetic field; a soft-iron core concentrates it.", "الملف الذي يمر به تيار يولد مجالاً مغناطيسياً، والقلب الحديدي يركّزه."),
    questions: [{ id: "q1", prompt: t("Which change makes the electromagnet stronger?", "أي تغيير يقوي المغناطيس الكهربي؟"), options: [t("Fewer turns", "تقليل اللفات"), t("More current", "زيادة التيار"), t("Removing the core", "إزالة القلب")], hint: t("B ∝ N·I", "B ∝ N·I") }],
    hints: [],
    template: [P("battery", -1.4, 0), P("switch", 0, -0.9), P("electromagnet", 1.2, 0), P("compass", 1.2, 0.9)],
    criteria: "electromagnet-on",
    completion: t("Electromagnet field indicator above 5 mT.", "مؤشر مجال المغناطيس الكهربي أكبر من 5 ملي تسلا."),
    achievement: "electromagnet",
  },
  {
    id: "led-resistor",
    lab: "physics",
    difficulty: 2,
    xp: 50,
    title: t("Light an LED safely", "إضاءة LED بأمان"),
    objective: t("Use a series resistor to limit LED current.", "استخدام مقاومة على التوالي لتحديد تيار الـLED."),
    equipment: ["battery", "resistor", "led"],
    steps: [t("Connect + → resistor → LED anode; LED cathode → −.", "صِل الموجب ← المقاومة ← مصعد الـLED؛ المهبط ← السالب."), t("Choose a resistance that keeps the current below 25 mA.", "اختر مقاومة تبقي التيار أقل من 25 ملي أمبير.")],
    safety: [],
    expected: [t("The LED glows without an over-current warning.", "يضيء الـLED دون تحذير زيادة التيار.")],
    explanation: t("An LED conducts only forwards and has almost no resistance once on, so a resistor must limit its current: R = (V − Vf) / I.", "يوصل الـLED في اتجاه واحد ومقاومته شبه معدومة بعد التشغيل، لذا تلزم مقاومة: R = (V − Vf) / I."),
    questions: [],
    hints: [t("Try 330 Ω with a 9 V battery.", "جرّب 330 أوم مع بطارية 9 فولت.")],
    template: [P("battery", -1.2, 0), P("resistor", 0.2, -0.8), P("led", 1.2, 0)],
    criteria: "led-safe",
    completion: t("LED on, current ≤ 25 mA.", "LED مضاء والتيار ≤ 25 ملي أمبير."),
    achievement: "led_master",
  },
  // ------------------------------ chemistry ------------------------------
  {
    id: "neutralization-indicator",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 1,
    xp: 50,
    title: t("Neutralisation with an indicator", "التعادل باستخدام دليل"),
    objective: t("Neutralise sodium hydroxide with hydrochloric acid, watching phenolphthalein.", "معادلة هيدروكسيد الصوديوم بحمض الهيدروكلوريك مع مراقبة الفينولفثالين."),
    equipment: ["beaker-250", "reagent-bottle"],
    steps: [t("Add NaOH solution to the beaker.", "أضف محلول هيدروكسيد الصوديوم إلى الكأس."), t("Add a few drops of phenolphthalein — it turns pink.", "أضف قطرات من الفينولفثالين — يتحول للوردي."), t("Add HCl until the pink colour disappears.", "أضف حمض الهيدروكلوريك حتى يختفي اللون الوردي.")],
    safety: [t("Acids and alkalis are corrosive — goggles on in a real lab.", "الأحماض والقلويات كاوية — ارتدِ النظارة في المعمل الحقيقي.")],
    expected: [t("Pink → colourless at neutralisation; the beaker warms slightly.", "وردي ← عديم اللون عند التعادل؛ وترتفع الحرارة قليلاً.")],
    explanation: t("H⁺ + OH⁻ → H₂O. Phenolphthalein is pink above pH ≈ 8.2 and colourless below.", "H⁺ + OH⁻ → H₂O. الفينولفثالين وردي فوق pH ≈ 8.2 وعديم اللون تحته."),
    questions: [{ id: "q1", prompt: t("The products of neutralisation are…", "نواتج التعادل هي…"), options: [t("salt + water", "ملح + ماء"), t("salt + hydrogen", "ملح + هيدروجين"), t("oxide + water", "أكسيد + ماء")], hint: t("Look at the equation.", "انظر إلى المعادلة.") }],
    hints: [],
    template: [P("beaker-250", 0, 0)],
    criteria: "neutralization-indicator",
    completion: t("Neutralisation observed in a beaker containing phenolphthalein.", "تم رصد التعادل في كأس به الفينولفثالين."),
    achievement: "first_chem_reaction",
  },
  {
    id: "acid-metal",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 1,
    xp: 40,
    title: t("Metals and acids", "تفاعل الفلزات مع الأحماض"),
    objective: t("Observe hydrogen gas released when zinc reacts with acid.", "رصد تصاعد غاز الهيدروجين عند تفاعل الخارصين مع الحمض."),
    equipment: ["test-tube", "reagent-bottle"],
    steps: [t("Add dilute HCl to a test tube.", "أضف حمض الهيدروكلوريك المخفف إلى أنبوبة اختبار."), t("Drop in zinc granules.", "أضف حبيبات الخارصين.")],
    safety: [t("Hydrogen is flammable.", "الهيدروجين قابل للاشتعال.")],
    expected: [t("Bubbles form on the zinc.", "تتكون فقاعات على الخارصين.")],
    explanation: t("Zn + 2HCl → ZnCl₂ + H₂ — a single displacement reaction.", "Zn + 2HCl → ZnCl₂ + H₂ — تفاعل إحلال بسيط."),
    questions: [{ id: "q1", prompt: t("Which metal does NOT react with dilute HCl?", "أي الفلزات لا يتفاعل مع حمض الهيدروكلوريك المخفف؟"), options: [t("Magnesium", "الماغنسيوم"), t("Zinc", "الخارصين"), t("Copper", "النحاس")], hint: t("Check the activity series.", "راجع متسلسلة النشاط.") }],
    hints: [],
    template: [P("test-tube", 0, 0)],
    criteria: "reaction:acid-metal-zn-hcl|acid-metal-mg-hcl|acid-metal-fe-hcl",
    completion: t("A metal–acid reaction released hydrogen.", "تفاعل فلز مع حمض أطلق الهيدروجين."),
  },
  {
    id: "precipitation",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 1,
    xp: 40,
    title: t("Precipitation reactions", "تفاعلات الترسيب"),
    objective: t("Form an insoluble solid by mixing two solutions.", "تكوين راسب غير ذائب بخلط محلولين."),
    equipment: ["test-tube", "reagent-bottle"],
    steps: [t("Add silver nitrate (or copper sulfate) solution.", "أضف محلول نترات الفضة (أو كبريتات النحاس)."), t("Add sodium chloride (or sodium hydroxide) solution.", "أضف محلول كلوريد الصوديوم (أو هيدروكسيد الصوديوم).")],
    safety: [],
    expected: [t("A cloudy precipitate forms and settles.", "يتكون راسب عكر ويترسب.")],
    explanation: t("Ions that form an insoluble compound leave the solution as a solid.", "الأيونات التي تكوّن مركباً غير ذائب تنفصل عن المحلول كمادة صلبة."),
    questions: [{ id: "q1", prompt: t("AgNO₃ + NaCl gives a precipitate of…", "AgNO₃ + NaCl يعطي راسباً من…"), options: [t("AgCl (white)", "AgCl (أبيض)"), t("NaNO₃", "NaNO₃"), t("Ag (grey)", "Ag (رمادي)")], hint: t("Which product is insoluble?", "أي النواتج غير ذائب؟") }],
    hints: [],
    template: [P("test-tube", -0.4, 0), P("test-tube", 0.4, 0)],
    criteria: "precipitate-any",
    completion: t("Any validated precipitation reaction observed.", "رصد أي تفاعل ترسيب موثق."),
  },
  {
    id: "displacement",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 2,
    xp: 50,
    title: t("Metal displacement", "إحلال الفلزات"),
    objective: t("Show that iron displaces copper from copper sulfate.", "إثبات أن الحديد يحل محل النحاس في كبريتات النحاس."),
    equipment: ["beaker-100", "reagent-bottle"],
    steps: [t("Pour copper(II) sulfate solution into a beaker.", "صب محلول كبريتات النحاس في كأس."), t("Add iron filings (or zinc).", "أضف برادة الحديد (أو الخارصين).")],
    safety: [],
    expected: [t("Blue fades; reddish copper appears.", "يبهت اللون الأزرق ويظهر نحاس محمر.")],
    explanation: t("A more reactive metal displaces a less reactive one from its compound.", "الفلز الأنشط يحل محل الفلز الأقل نشاطاً في مركبه."),
    questions: [],
    hints: [],
    template: [P("beaker-100", 0, 0)],
    criteria: "reaction:displacement-fe-cuso4|displacement-zn-cuso4|displacement-cu-agno3",
    completion: t("A metal displacement reaction observed.", "رصد تفاعل إحلال فلز."),
  },
  {
    id: "thermal-decomposition",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 2,
    xp: 50,
    title: t("Thermal decomposition", "التحلل الحراري"),
    objective: t("Heat copper(II) carbonate and observe the colour change.", "سخّن كربونات النحاس ولاحظ تغير اللون."),
    equipment: ["test-tube", "bunsen-burner"],
    steps: [t("Add copper carbonate powder to a dry test tube.", "ضع مسحوق كربونات النحاس في أنبوبة جافة."), t("Place it on the burner and heat.", "ضعها فوق الموقد وسخّن.")],
    safety: [t("Point test tubes away from people when heating.", "وجّه الأنبوبة بعيداً عن الأشخاص أثناء التسخين.")],
    expected: [t("Green → black; CO₂ released.", "أخضر ← أسود؛ ويتصاعد ثاني أكسيد الكربون.")],
    explanation: t("CuCO₃ → CuO + CO₂ (decomposition by heat).", "CuCO₃ → CuO + CO₂ (تحلل بالحرارة)."),
    questions: [{ id: "q1", prompt: t("The black product is…", "الناتج الأسود هو…"), options: [t("Copper metal", "فلز النحاس"), t("Copper(II) oxide", "أكسيد النحاس (II)"), t("Carbon", "كربون")], hint: t("CO₂ left as a gas.", "خرج CO₂ كغاز.") }],
    hints: [],
    template: [P("test-tube", 0, 0), P("bunsen-burner", 0.9, 0)],
    criteria: "reaction:decomp-cuco3-heat",
    completion: t("Copper carbonate decomposed on heating.", "تحللت كربونات النحاس بالتسخين."),
  },
  {
    id: "catalyst",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 2,
    xp: 50,
    title: t("A catalyst at work", "عامل حفاز في العمل"),
    objective: t("Speed up hydrogen peroxide decomposition with MnO₂.", "تسريع تحلل فوق أكسيد الهيدروجين باستخدام ثاني أكسيد المنجنيز."),
    equipment: ["conical-flask", "reagent-bottle"],
    steps: [t("Add hydrogen peroxide to a flask — nothing visible happens.", "أضف فوق أكسيد الهيدروجين إلى الدورق — لا يحدث شيء ظاهر."), t("Add a pinch of MnO₂.", "أضف قليلاً من ثاني أكسيد المنجنيز.")],
    safety: [],
    expected: [t("Vigorous oxygen bubbles; MnO₂ remains.", "فقاعات أكسجين شديدة؛ ويبقى ثاني أكسيد المنجنيز.")],
    explanation: t("A catalyst lowers the activation energy and is not used up.", "العامل الحفاز يخفض طاقة التنشيط ولا يُستهلك."),
    questions: [],
    hints: [],
    template: [P("conical-flask", 0, 0)],
    criteria: "reaction:decomp-h2o2-mno2",
    completion: t("Catalysed decomposition observed.", "رصد تحلل محفَّز."),
  },
  {
    id: "steel-wool-combustion",
    lab: "chemistry",
    unit: "eg-g9-t1-u1",
    difficulty: 2,
    xp: 50,
    title: t("Burning steel wool (virtual only)", "احتراق صوف الصلب (افتراضي فقط)"),
    objective: t("See that finely divided iron combines with oxygen when heated.", "ملاحظة أن الحديد المجزأ يتحد مع الأكسجين عند تسخينه."),
    equipment: ["crucible", "bunsen-burner"],
    steps: [t("Pull a tuft of steel wool into the crucible.", "اسحب قطعة من صوف الصلب إلى البوتقة."), t("Put the crucible on the burner and heat.", "ضع البوتقة فوق الموقد وسخّن.")],
    safety: [t("Virtual only. Sparks can start fires.", "افتراضي فقط. الشرر قد يسبب حرائق.")],
    expected: [t("Orange glow and sparks; the wool turns dark brown.", "توهج برتقالي وشرر؛ ويتحول الصوف إلى بني داكن.")],
    explanation: t("4Fe + 3O₂ → 2Fe₂O₃ — a combination (oxidation) reaction.", "4Fe + 3O₂ → 2Fe₂O₃ — تفاعل اتحاد (أكسدة)."),
    questions: [{ id: "q1", prompt: t("After burning, the solid's mass…", "بعد الاحتراق تكون كتلة المادة الصلبة…"), options: [t("increases", "أكبر"), t("decreases", "أقل"), t("is unchanged", "بدون تغيير")], hint: t("Oxygen atoms joined the iron.", "ذرات الأكسجين اتحدت مع الحديد.") }],
    hints: [],
    template: [P("crucible", 0, 0), P("bunsen-burner", 0.9, 0)],
    criteria: "reaction:combustion-steel-wool",
    completion: t("Steel wool combustion observed.", "رصد احتراق صوف الصلب."),
    achievement: "pyro_virtual",
  },
  // ------------------------------ biology / earth ------------------------------
  {
    id: "punnett-monohybrid",
    lab: "biology",
    unit: "eg-g9-t1-u3",
    difficulty: 2,
    xp: 50,
    title: t("Punnett squares: a monohybrid cross", "مربع بانيت: تهجين أحادي"),
    objective: t("Predict offspring ratios for a single trait.", "توقع نسب الأبناء لصفة واحدة."),
    equipment: [],
    steps: [t("Choose the parents' genotypes.", "اختر التركيب الجيني للأبوين."), t("Fill the Punnett square and run the probability simulation.", "املأ مربع بانيت وشغّل محاكاة الاحتمالات.")],
    safety: [],
    expected: [t("Aa × Aa gives 3 dominant : 1 recessive phenotypes.", "Aa × Aa يعطي 3 سائد : 1 متنحٍ في الصفات الظاهرية.")],
    explanation: t("Each parent passes one allele at random (Mendel's law of segregation).", "كل أب يورّث أليلاً واحداً عشوائياً (قانون مندل للانعزال)."),
    questions: [{ id: "q1", prompt: t("Tt × Tt (T = tall). What fraction of offspring are short?", "Tt × Tt (T = طويل). ما نسبة الأبناء القصار؟"), options: [t("1/4", "1/4"), t("1/2", "1/2"), t("3/4", "3/4")], hint: t("Only tt is short.", "فقط tt قصير.") }],
    hints: [],
    template: [],
    criteria: "quiz-only",
    completion: t("Quiz answered correctly.", "إجابة الاختبار صحيحة."),
    achievement: "genetics_explorer",
  },
  {
    id: "geologic-timeline",
    lab: "earth",
    unit: "eg-g9-t1-u4",
    difficulty: 1,
    xp: 50,
    title: t("Earth's history timeline", "الخط الزمني لتاريخ الأرض"),
    objective: t("Place the major eras and fossils in order.", "ترتيب الحقب الكبرى والحفريات."),
    equipment: [],
    steps: [t("Explore the timeline and the fossils of each era.", "استكشف الخط الزمني وحفريات كل حقبة."), t("Answer the ordering question.", "أجب عن سؤال الترتيب.")],
    safety: [],
    expected: [t("Paleozoic → Mesozoic → Cenozoic.", "حقب الحياة القديمة ← الوسطى ← الحديثة.")],
    explanation: t("Lower rock layers are usually older (law of superposition); fossils record changing life.", "الطبقات السفلى أقدم عادة (قانون تعاقب الطبقات)؛ والحفريات تسجل تغير الحياة."),
    questions: [{ id: "q1", prompt: t("In which era did non-avian dinosaurs live?", "في أي حقبة عاشت الديناصورات؟"), options: [t("Paleozoic", "حقب الحياة القديمة"), t("Mesozoic", "حقب الحياة الوسطى"), t("Cenozoic", "حقب الحياة الحديثة")], hint: t("The 'middle life' era.", "حقب «الحياة الوسطى».") }],
    hints: [],
    template: [],
    criteria: "quiz-only",
    completion: t("Quiz answered correctly.", "إجابة الاختبار صحيحة."),
    achievement: "time_traveller",
  },
];

export function getExperiment(id: string) {
  return EXPERIMENTS.find((e) => e.id === id);
}
