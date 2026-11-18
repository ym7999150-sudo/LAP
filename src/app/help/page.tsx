"use client";
import { Page } from "@/components/ui/Page";
import { useI18n } from "@/lib/i18n/client";

const SECTIONS = [
  {
    title: { en: "Building a circuit", ar: "بناء دائرة كهربية" },
    body: {
      en: "Add components from the library. Choose the Wire tool (W), press on a terminal, drag to another terminal and release. Double-click a switch to toggle it. The solver uses Modified Nodal Analysis; every wire is a 1 mΩ conductor so currents in each wire are real values.",
      ar: "أضف العناصر من المكتبة. اختر أداة السلك (W) ثم اضغط على طرف واسحب إلى طرف آخر وأفلت. انقر مرتين على المفتاح لتغيير حالته. يعتمد المحاكي على التحليل العقدي المعدّل؛ وكل سلك موصل مقاومته 1 ملي أوم لذلك تيارات الأسلاك قيم حقيقية.",
    },
  },
  {
    title: { en: "What is simulated", ar: "ما الذي يُحاكى" },
    body: {
      en: "DC steady state: resistors, batteries with internal resistance, switches, fuses, bulbs, motors (as resistance), heaters, LEDs and diodes (piecewise-linear), electromagnets, ammeters, voltmeters, ohmmeters and multimeters. Capacitors are open circuits and inductors are their winding resistance (DC steady state). AC, transients, transistors and op-amps are not simulated yet and are labelled as such.",
      ar: "حالة الاستقرار للتيار المستمر: المقاومات، البطاريات بمقاومتها الداخلية، المفاتيح، المنصهرات، المصابيح، المحركات (كمقاومة)، السخانات، الثنائيات والـLED (نموذج خطي متقطع)، المغناطيس الكهربي، الأميتر والفولتميتر والأوميتر والملتيميتر. المكثف دائرة مفتوحة والملف مقاومة سلكه. التيار المتردد والحالات العابرة والترانزستورات ومكبرات العمليات غير مُحاكاة بعد ومعلَّمة بذلك.",
    },
  },
  {
    title: { en: "Chemistry lab", ar: "معمل الكيمياء" },
    body: {
      en: "Select a container, then tap a reagent on the shelf to pour or scoop it in. Use 'Pour into…' to transfer between containers, and drop a container on a lit burner to heat it. Drag from the steel-wool pad onto a crucible to pull off a tuft. Only validated, atom-balanced reactions run; other combinations are reported as unsupported instead of inventing a result.",
      ar: "اختر وعاءً ثم انقر على كاشف من الرف لصبه أو إضافته. استخدم «اصبب في…» للنقل بين الأوعية، وضع الوعاء فوق موقد مشتعل لتسخينه. اسحب من لفة صوف الصلب إلى البوتقة لتنتزع قطعة. تعمل فقط التفاعلات الموثقة والموزونة؛ وأي مزيج آخر يُعلن أنه غير مدعوم بدلاً من اختلاق نتيجة.",
    },
  },
  {
    title: { en: "Safety", ar: "السلامة" },
    body: {
      en: "LabVerse is a virtual lab. Reactions marked 'virtual only' (sodium in water, burning magnesium or steel wool, lead compounds…) must never be attempted outside a properly supervised setting. Always wear goggles in a real lab.",
      ar: "LabVerse معمل افتراضي. التفاعلات المعلَّمة «افتراضي فقط» (الصوديوم في الماء، احتراق الماغنسيوم أو صوف الصلب، مركبات الرصاص…) لا تُجرَّب أبداً خارج بيئة خاضعة لإشراف مناسب. ارتدِ النظارة الواقية دائماً في المعمل الحقيقي.",
    },
  },
  {
    title: { en: "XP and fairness", ar: "النقاط والعدالة" },
    body: {
      en: "Your browser never decides your score. When you finish something, the server re-runs the circuit solver or replays the chemistry operations and grants each reward at most once.",
      ar: "متصفحك لا يحدد نقاطك أبداً. عند إنهاء أي شيء يعيد الخادم تشغيل محاكي الدوائر أو إعادة عمليات الكيمياء ويمنح كل مكافأة مرة واحدة فقط.",
    },
  },
  {
    title: { en: "Keyboard shortcuts", ar: "اختصارات لوحة المفاتيح" },
    body: { en: "V select · W wire · R rotate · Delete remove · Ctrl+D duplicate · Ctrl+Z / Ctrl+Y undo/redo · Ctrl+S save · Esc cancel", ar: "V تحديد · W سلك · R تدوير · Delete حذف · Ctrl+D نسخ · Ctrl+Z / Ctrl+Y تراجع/إعادة · Ctrl+S حفظ · Esc إلغاء" },
  },
  {
    title: { en: "3D assets & sounds", ar: "النماذج والأصوات" },
    body: {
      en: "All 3D equipment is procedurally generated in code and all sound effects are synthesised with the Web Audio API, so nothing depends on third-party files at runtime. See ASSETS.md for the asset manifest and how to add licensed GLB models.",
      ar: "كل الأدوات ثلاثية الأبعاد مولدة برمجياً وكل المؤثرات الصوتية مركّبة عبر Web Audio، فلا يعتمد شيء على ملفات خارجية أثناء التشغيل. راجع ASSETS.md لقائمة الأصول وطريقة إضافة نماذج GLB مرخصة.",
    },
  },
];

export default function Help() {
  const { t, L } = useI18n();
  return (
    <Page title={t("nav_help")}>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <section key={i} className="panel p-5">
            <h2 className="font-semibold">{L(s.title)}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{L(s.body)}</p>
          </section>
        ))}
      </div>
    </Page>
  );
}
